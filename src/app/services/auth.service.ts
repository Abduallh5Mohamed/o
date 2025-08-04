import { Injectable, OnDestroy } from '@angular/core';
import { 
  Auth, 
  UserCredential, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User,
  onAuthStateChanged,
  Unsubscribe,
  GoogleAuthProvider,
  signInWithPopup,
  FacebookAuthProvider
} from '@angular/fire/auth';
import { doc, setDoc, Firestore, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject, from, Observable, of, Subscription } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private userSubject = new BehaviorSubject<User | null>(null);
  private userDataSubject = new BehaviorSubject<UserData | null>(null);
  private authStateSubscription: Unsubscribe;
  
  // Public observables
  user$ = this.userSubject.asObservable();
  userData$ = this.userDataSubject.asObservable();
  isAuthenticated$ = this.user$.pipe(map(user => !!user));

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    // Subscribe to auth state changes
    this.authStateSubscription = onAuthStateChanged(this.auth, async (user) => {
      this.userSubject.next(user);
      
      if (user) {
        // Get additional user data from Firestore
        const userData = await this.getUserData(user.uid);
        this.userDataSubject.next({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || userData?.displayName || '',
          photoURL: user.photoURL || userData?.photoURL || '',
          role: userData?.role || 'user',
          createdAt: userData?.createdAt instanceof Date ? userData.createdAt : new Date(),
          lastLoginAt: new Date()
        });
        
        // Update last login time
        await this.updateUserData({
          lastLoginAt: new Date()
        });
      } else {
        this.userDataSubject.next(null);
      }
    });
  }

  ngOnDestroy() {
    if (this.authStateSubscription) {
      this.authStateSubscription();
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string, displayName: string): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await this.setUserData({
        uid: user.uid,
        email: user.email || '',
        displayName,
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date()
      });

      return userCredential;
    } catch (error) {
      console.error('Error signing up:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential;
    } catch (error) {
      console.error('Error signing in:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      
      // Check if user is new
      if (result.user.metadata.creationTime === result.user.metadata.lastSignInTime) {
        // New user, create profile
        await this.setUserData({
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign in with Facebook
  async signInWithFacebook() {
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      
      // Check if user is new
      if (result.user.metadata.creationTime === result.user.metadata.lastSignInTime) {
        // New user, create profile
        await this.setUserData({
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error signing in with Facebook:', error);
      throw this.handleAuthError(error);
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error signing out:', error);
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Get current user data
  getCurrentUserData(): UserData | null {
    return this.userDataSubject.value;
  }

  // Check if user has specific role
  hasRole(role: string): Observable<boolean> {
    return this.userData$.pipe(
      take(1),
      map(userData => userData?.role === role || false)
    );
  }

  // Get user data from Firestore
  private async getUserData(uid: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(this.firestore, `users/${uid}`));
      return userDoc.exists() ? (userDoc.data() as UserData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Set user data in Firestore
  async setUserData(userData: Partial<UserData> & { uid: string }): Promise<void> {
    try {
      const userRef = doc(this.firestore, `users/${userData.uid}`);
      await setDoc(userRef, userData, { merge: true });
      
      // Update local state
      if (this.userDataSubject.value?.uid === userData.uid) {
        this.userDataSubject.next({
          ...this.userDataSubject.value,
          ...userData
        });
      }
    } catch (error) {
      console.error('Error setting user data:', error);
      throw error;
    }
  }

  // Update user data
  async updateUserData(data: Partial<UserData>): Promise<void> {
    const user = this.getCurrentUser();
    if (user) {
      return this.setUserData({
        uid: user.uid,
        ...data
      });
    }
    throw new Error('No user is currently signed in');
  }

  // Handle authentication errors
  private handleAuthError(error: any): Error {
    // Log known authentication errors as warnings instead of errors
    const knownErrorCodes = [
      'auth/email-already-in-use',
      'auth/invalid-email',
      'auth/weak-password',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/too-many-requests',
      'auth/popup-closed-by-user'
    ];
    
    if (error.code && knownErrorCodes.includes(error.code)) {
      console.warn('Auth warning:', error);
    } else {
      console.error('Auth error:', error);
    }
    
    // Default error message
    let message = 'An error occurred during authentication';
    
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          message = 'Invalid email or password';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/popup-closed-by-user':
          message = 'Sign in was cancelled';
          break;
        // Add more error codes as needed
      }
    }
    
    return new Error(message);
  }
}
