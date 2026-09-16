import { NgIf, NgStyle } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { FwkAlertComponent, FwkAlertType } from '../../../layout/infrastructure/components/alert';
import { FwkValidators } from '../../../layout/infrastructure/validators';
import { AuthService } from '../../auth.service';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { LogoComponent } from '../../../components/logo/logo.component';
import { FWK_CONFIG, FwkConfig } from '../../../model/fwk-config';

interface ResetPasswordForm {
    password: FormControl<string | null>;
    passwordConfirm: FormControl<string | null>;
}

@Component({
    selector: 'auth-reset-password',
    templateUrl: './reset-password.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fwkAnimations,
    standalone: true,
    imports: [NgIf, NgStyle, FwkAlertComponent, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink, TranslatePipe, LogoComponent],
})
export class AuthResetPasswordComponent implements OnInit, OnDestroy {
    @ViewChild('resetPasswordNgForm') resetPasswordNgForm!: NgForm;

    public fwkConfig = inject<FwkConfig>(FWK_CONFIG);

    alert: { type: FwkAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    resetPasswordForm!: FormGroup<ResetPasswordForm>;
    showAlert: boolean = false;
    isSuccess: boolean = false;
    countdown: number = 5;
    countdownMessage: string = '';
    token: string = '';
    email: string = '';

    private _countdownInterval: any = null;

    private _i18nService = inject(I18nService);
    private _route = inject(ActivatedRoute);
    private _router = inject(Router);
    private _cdr = inject(ChangeDetectorRef);
    private _authService = inject(AuthService);
    private _formBuilder = inject(FormBuilder);

    constructor() {}

    ngOnInit(): void {
        this.token = this._route.snapshot.queryParams['token'] || '';
        this.email = this._route.snapshot.queryParams['email'] || '';

        this._route.queryParams.subscribe((params) => {
            if (params['token']) {
                this.token = params['token'];
            }
            if (params['email']) {
                this.email = params['email'];
            }
        });

        this.resetPasswordForm = this._formBuilder.group({
            password: ['', Validators.required],
            passwordConfirm: ['', Validators.required],
        },
            {
                validators: FwkValidators.mustMatch('password', 'passwordConfirm'),
            },
        );
    }

    ngOnDestroy(): void {
        this.stopCountdown();
    }

    resetPassword(): void {
        if (this.resetPasswordForm.invalid) {
            return;
        }

        this.isSuccess = false;
        this.resetPasswordForm.disable();
        this.showAlert = false;

        const password = this.resetPasswordForm.get('password')?.value ?? '';
        const payload = {
            email: this.email,
            pass: password,
            password: password,
            token: this.token,
        };

        this._authService.resetPassword(payload)
            .pipe(
                finalize(() => {
                    if (!this.isSuccess) {
                        this.resetPasswordForm.enable();
                    }
                    this.showAlert = true;
                    this._cdr.markForCheck();
                }),
            )
            .subscribe({
                next: (response) => {
                    if (response && (response.success === false || response.ok === false)) {
                        this.isSuccess = false;
                        const fallback = this._i18nService.translate('reset_password_error_message');
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
                error: (response) => {
                    this.isSuccess = false;
                    const fallback = this._i18nService.translate('reset_password_error_message');
                    this.alert = {
                        type: 'error',
                        message: response?.userMessage || response?.message || fallback,
                    };
                    this._cdr.markForCheck();
                },
            });
    }

    goToSignIn(): void {
        this.stopCountdown();
        this._router.navigate(['/sign-in']);
    }

    private startCountdown(): void {
        this.countdown = 5;
        this.updateCountdownMessage();

        this.stopCountdown();

        this._countdownInterval = setInterval(() => {
            this.countdown--;
            this.updateCountdownMessage();

            if (this.countdown <= 0) {
                this.stopCountdown();
                this._router.navigate(['/sign-in']);
            }
        }, 1000);
    }

    private stopCountdown(): void {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
    }

    private updateCountdownMessage(): void {
        const baseMessage = this._i18nService.translate('reset_password_redirect_countdown');
        this.countdownMessage = baseMessage.replace('{{countdown}}', this.countdown.toString());
        this._cdr.markForCheck();
    }
}