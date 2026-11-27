import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService)
  private router = inject(Router)

  error = signal<string | null>(null)
  loading = signal(false)

  form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  })

  onSubmit() {
    if (this.form.invalid) {return this.form.markAllAsTouched()}
    this.loading.set(true)
    this.error.set(null)
    const {email, password} = this.form.getRawValue()
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error.set('Invalid Credentials')
        this.loading.set(false)
      }
    })
  }
}
