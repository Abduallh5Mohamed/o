import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../app/services/auth.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-pending-verification',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pending-verification.component.html',
  styleUrls: ['./pending-verification.component.css']
})
export class PendingVerificationComponent implements OnInit, OnDestroy {
  userEmail: string = '';
  isResending: boolean = false;
  resendMessage: string = '';
  private verificationCheckSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Get current user email
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userEmail = user.email || '';
      this.startVerificationCheck();
    } else {
      // If no user, redirect to login
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy() {
    if (this.verificationCheckSubscription) {
      this.verificationCheckSubscription.unsubscribe();
    }
  }

  private startVerificationCheck() {
    // Check every 3 seconds if email is verified
    this.verificationCheckSubscription = interval(3000)
      .pipe(
        switchMap(() => this.authService.checkEmailVerification()),
        takeWhile(isVerified => !isVerified, true)
      )
      .subscribe(isVerified => {
        if (isVerified) {
          // Email verified, redirect to dashboard
          this.router.navigate(['/dashboard']);
        }
      });
  }

  async resendVerificationEmail() {
    this.isResending = true;
    this.resendMessage = '';

    try {
      await this.authService.sendEmailVerification();
      this.resendMessage = 'Verification email sent successfully! Please check your inbox.';
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      this.resendMessage = 'Failed to send verification email. Please try again.';
    } finally {
      this.isResending = false;
    }
  }

  async signOut() {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }
}