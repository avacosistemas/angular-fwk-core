import { NgIf, NgStyle } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
export class AuthResetPasswordComponent implements OnInit {
    @ViewChild('resetPasswordNgForm') resetPasswordNgForm!: NgForm;

    public fwkConfig = inject<FwkConfig>(FWK_CONFIG);

    alert: { type: FwkAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    resetPasswordForm!: FormGroup<ResetPasswordForm>;
    showAlert: boolean = false;
    token: string = '';
    email: string = '';
    private _i18nService = inject(I18nService);
    private _route = inject(ActivatedRoute);

    constructor(
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
    ) {
    }

    ngOnInit(): void {
        this.token = this._route.snapshot.queryParams['token'] || this._route.snapshot.queryParams['code'] || '';
        this.email = this._route.snapshot.queryParams['email'] || '';

        this._route.queryParams.subscribe((params) => {
            if (params['token'] || params['code']) {
                this.token = params['token'] || params['code'];
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

    resetPassword(): void {
        if (this.resetPasswordForm.invalid) {
            return;
        }

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
                    this.resetPasswordForm.enable();
                    this.resetPasswordNgForm.resetForm();
                    this.showAlert = true;
                }),
            )
            .subscribe(
                (response) => {
                    this.alert = {
                        type: 'success',
                        message: this._i18nService.translate('reset_password_success_message'),
                    };
                },
                (response) => {
                    const fallback = this._i18nService.translate('reset_password_error_message');
                    this.alert = {
                        type: 'error',
                        message: response?.userMessage || response?.message || fallback,
                    };
                },
            );
    }
}