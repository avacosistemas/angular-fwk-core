import { NgIf } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { FwkAlertComponent, FwkAlertType } from '../../../layout/infrastructure/components/alert';
import { AuthService } from '../../auth.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { LogoComponent } from '../../../components/logo/logo.component';
import { switchMap } from 'rxjs/operators';
import { UserService } from '../../user.service';

@Component({
    selector: 'auth-change-password',
    templateUrl: './change-password.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fwkAnimations,
    standalone: true,
    imports: [NgIf, FwkAlertComponent, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink, TranslatePipe, LogoComponent],
})
export class AuthChangePasswordComponent implements OnInit {
    @ViewChild('changePasswordNgForm') changePasswordNgForm!: NgForm;

    alert: { type: FwkAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    changePasswordForm!: FormGroup;
    showAlert: boolean = false;
    isSuccess: boolean = false;
    countdown: number = 5;

    private _authService = inject(AuthService);
    private _formBuilder = inject(FormBuilder);
    private _router = inject(Router);
    private _i18nService = inject(I18nService);
    private _userService = inject(UserService);

    constructor() { }

    ngOnInit(): void {
        this.changePasswordForm = this._formBuilder.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', Validators.required],
            passwordConfirm: ['', Validators.required],
        },
            {
                validators: this.passwordMatchValidator
            });
    }

    passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
        const newPassword = control.get('newPassword');
        const passwordConfirm = control.get('passwordConfirm');
        return newPassword && passwordConfirm && newPassword.value !== passwordConfirm.value
            ? { passwordsNotMatch: true }
            : null;
    };

    changePassword(): void {
        if (this.changePasswordForm.invalid) {
            return;
        }

        this.changePasswordForm.disable();
        this.showAlert = false;

        const currentUser = this._userService.userValue;
        const username = currentUser?.username || currentUser?.name || '';
        const newPassword = this.changePasswordForm.get('newPassword')?.value ?? '';

        const changePayload = {
            currentPassword: this.changePasswordForm.get('currentPassword')?.value ?? '',
            newPassword: newPassword,
            username: username
        };

        this._authService.changePassword(changePayload)
            .pipe(
                switchMap(() => {
                    return this._authService.signIn({
                        username: username,
                        password: newPassword
                    });
                })
            )
            .subscribe({
                next: () => {
                    this._router.navigate(['/']);
                },
                error: (error) => {
                    this.changePasswordForm.enable();

                    let errorMsg = 'change_password_error_message';

                    if (error.status === 409 || error.error?.status === 'BAD_CREDENTIAL') {
                        errorMsg = 'current_password_invalid_error';
                        this.changePasswordForm.get('currentPassword')?.setErrors({ invalid: true });
                    }

                    else if (error.status === 401) {
                        this._router.navigate(['/sign-in']);
                        return;
                    }

                    this.alert = {
                        type: 'error',
                        message: this._i18nService.translate(errorMsg),
                    };
                    this.showAlert = true;
                }
            });
    }
}