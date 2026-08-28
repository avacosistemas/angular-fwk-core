import { NgIf, NgStyle } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { FwkAlertComponent, FwkAlertType } from '../../../layout/infrastructure/components/alert';
import { AuthService } from '../../auth.service';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { finalize } from 'rxjs';
import { LogoComponent } from '../../../components/logo/logo.component';
import { FWK_CONFIG } from '../../../model/fwk-config';

interface ForgotPasswordForm {
    email: FormControl<string | null>;
}

@Component({
    selector: 'auth-forgot-password',
    templateUrl: './forgot-password.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fwkAnimations,
    standalone: true,
    imports: [NgIf, NgStyle, FwkAlertComponent, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule, RouterLink, TranslatePipe, LogoComponent],
})
export class AuthForgotPasswordComponent implements OnInit {
    @ViewChild('forgotPasswordNgForm') forgotPasswordNgForm!: NgForm;

    public fwkConfig = inject(FWK_CONFIG);

    alert: { type: FwkAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    forgotPasswordForm!: FormGroup<ForgotPasswordForm>;
    showAlert: boolean = false;
    
    isSuccess: boolean = false;
    countdown: number = 5;

    private _i18nService = inject(I18nService);
    private _router = inject(Router);
    private _cdr = inject(ChangeDetectorRef);

    constructor(
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
    ) {
    }

    ngOnInit(): void {
        this.forgotPasswordForm = this._formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
        });
    }

    sendResetLink(): void {
        if (this.forgotPasswordForm.invalid) {
            return;
        }

        this.isSuccess = false;
        this.forgotPasswordForm.disable();
        this.showAlert = false;

        this._authService.forgotPassword(this.forgotPasswordForm.get('email')?.value ?? '')
            .pipe(
                finalize(() => {
                    if (!this.isSuccess) {
                        this.forgotPasswordForm.enable();
                    }
                    this.showAlert = true;
                    this._cdr.markForCheck();
                }),
            )
            .subscribe(
                (response) => {
                    if (response && (response.success === false || response.ok === false)) {
                        this.isSuccess = false;
                        const fallback = this._i18nService.translate('forgot_password_error_message');
                        this.alert = {
                            type: 'error',
                            message: response?.message || response?.userMessage || fallback,
                        };
                        this._cdr.markForCheck();
                        return;
                    }
                    this.isSuccess = true;
                    this.startCountdown();
                },
                (response) => {
                    this.isSuccess = false;
                    const fallback = this._i18nService.translate('forgot_password_error_message');
                    this.alert = {
                        type: 'error',
                        message: response?.userMessage || response?.message || fallback,
                    };
                    this._cdr.markForCheck();
                },
            );
    }

    private startCountdown(): void {
        this.updateSuccessMessage();

        const interval = setInterval(() => {
            this.countdown--;
            this.updateSuccessMessage();

            if (this.countdown <= 0) {
                clearInterval(interval);
                this._router.navigate(['/sign-in']);
            }
        }, 1000);
    }

    private updateSuccessMessage(): void {
        const message = this._i18nService.translate('forgot_password_success_message');
        this.alert = {
            type: 'success',
            message: message.replace('{{countdown}}', this.countdown.toString())
        };
    }
}