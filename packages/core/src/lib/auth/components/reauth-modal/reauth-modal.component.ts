import { Component, OnInit, AfterViewInit, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../auth.service';
import { UserService } from '../../user.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';

@Component({
  selector: 'fwk-reauth-modal',
  templateUrl: './reauth-modal.component.html',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe
  ]
})
export class ReauthModalComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  userName: string = '';
  userEmail: string = '';
  submitting: boolean = false;
  errorMessage: string | null = null;
  showPassword: boolean = false;

  private _authService = inject(AuthService);
  private _userService = inject(UserService);
  private _fb = inject(FormBuilder);
  private _dialogRef = inject(MatDialogRef<ReauthModalComponent>);
  private _cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const user = this._userService.userValue;
    this.userName = user?.name || '';

    const rawEmail = user?.email || '';
    const isInvalidEmail = !rawEmail || rawEmail.toLowerCase().includes('no especificado') || rawEmail.toLowerCase().includes('auth_email');
    this.userEmail = isInvalidEmail ? '' : rawEmail;

    const loginUser = user?.user || '';
    const isInvalidLoginUser = !loginUser || loginUser.toLowerCase().includes('no especificado');
    const initialUsername = !isInvalidLoginUser ? loginUser : (!isInvalidEmail ? rawEmail : '');

    this.form = this._fb.group({
      username: [initialUsername, Validators.required],
      password: ['', Validators.required]
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.form.get('password')?.setValue('');
    }, 150);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onCancel(): void {
    this._dialogRef.close(false);
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    this.errorMessage = null;
    this._cdr.markForCheck();

    const username = this.form.get('username')?.value;
    const password = this.form.get('password')?.value;

    this._authService.signIn({ username, password }).subscribe({
      next: () => {
        this.submitting = false;
        this._dialogRef.close({ success: true });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.userMessage || err?.message || 'Usuario o contraseña incorrectos. Por favor intente nuevamente.';
        this._cdr.markForCheck();
      }
    });
  }
}
