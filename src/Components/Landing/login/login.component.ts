import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../app/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    try {
      await this.authService.signIn(email, password);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        this.errorMessage = 'Invalid email or password.';
      } else {
        this.errorMessage = 'An error occurred. Please try again later.';
      }
    } finally {
      this.loading = false;
    }
  }

  // Helper method for template to access form controls
  get f() { return this.loginForm.controls; }

  // Social login methods
  async loginWithGoogle() {
    try {
      this.loading = true;
      this.errorMessage = '';
      await this.authService.signInWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Google login error:', error);
      this.errorMessage = error.message || 'Failed to sign in with Google';
    } finally {
      this.loading = false;
    }
  }

  async loginWithFacebook() {
    try {
      this.loading = true;
      this.errorMessage = '';
      await this.authService.signInWithFacebook();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Facebook login error:', error);
      this.errorMessage = error.message || 'Failed to sign in with Facebook';
    } finally {
      this.loading = false;
    }
  }
}
