import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../app/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = '';
  loading: boolean = false;
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validator: this.passwordMatchValidator 
    });
  }

  // Custom validator to check if passwords match
  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { email, password, displayName } = this.registerForm.value;

    try {
      await this.authService.signUp(email, password, displayName);
      this.successMessage = 'Registration successful! Redirecting to email verification...';
      
      // Redirect after a short delay
      setTimeout(() => {
        this.router.navigate(['/pending-verification']);
      }, 1500);
      
    } catch (error: any) {
      console.warn('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'This email is already registered. Please use a different email or log in.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'Password should be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage = 'Please enter a valid email address.';
      } else {
        this.errorMessage = 'An error occurred during registration. Please try again.';
      }
    } finally {
      this.loading = false;
    }
  }

  // Helper method for template to access form controls
  get f() { return this.registerForm.controls; }
}
