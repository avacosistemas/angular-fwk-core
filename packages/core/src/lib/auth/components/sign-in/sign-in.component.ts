import { NgComponentOutlet, NgIf, NgStyle } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation, Type } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { FwkAlertComponent, FwkAlertType } from '../../../layout/infrastructure/components/alert';
import { AuthService } from '../../auth.service';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { FWK_CONFIG, FWK_AUTH_FORM_FOOTER_CUSTOM_COMPONENT, FwkConfig } from '../../../model/fwk-config';
import { inject } from '@angular/core';
import { LogoComponent } from '../../../components/logo/logo.component';
import { LocalStorageService } from '../../../services/local-storage/local-storage.service';
import { UserService } from '../../user.service';

interface SignInForm {
    username: FormControl<string | null>;
    password: FormControl<string | null>;
    rememberMe: FormControl<boolean | null>;
}

@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fwkAnimations,
    standalone: true,
    imports: [RouterLink, FwkAlertComponent, NgIf, NgStyle, NgComponentOutlet, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressSpinnerModule, TranslatePipe, LogoComponent],
})
export class AuthSignInComponent implements OnInit {
    @ViewChild('signInNgForm') signInNgForm!: NgForm;

    public fwkConfig = inject<FwkConfig>(FWK_CONFIG);
    private _injectedCustomAuthFormFooterComponent = inject(FWK_AUTH_FORM_FOOTER_CUSTOM_COMPONENT, { optional: true });
    customAuthFormFooterComponent: Type<any> | null = this._injectedCustomAuthFormFooterComponent ?? this.fwkConfig.customAuthFormFooterComponent ?? null;

    private _localStorageService = inject(LocalStorageService);
    private _userService = inject(UserService);
    private _i18nService = inject(I18nService);
    private readonly REMEMBER_KEY = 'remembered_user';

    alert: { type: FwkAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    signInForm!: FormGroup<SignInForm>;
    showAlert: boolean = false;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _router: Router
    ) { }

    get showForgotPassword(): boolean {
        const linkOpt = this.fwkConfig.auth?.links?.forgotPassword;
        if (linkOpt?.show === false) return false;
        if (linkOpt?.show === true) return true;
        return !!(linkOpt?.url || (this.fwkConfig.auth?.forgotPassword && this.fwkConfig.auth.forgotPassword.trim() !== ''));
    }

    get forgotPasswordUrl(): string {
        return this.fwkConfig.auth?.links?.forgotPassword?.url || '/forgot-password';
    }

    get isForgotPasswordExternal(): boolean {
        if (this.fwkConfig.auth?.links?.forgotPassword?.isExternal !== undefined) {
            return this.fwkConfig.auth.links.forgotPassword.isExternal;
        }
        const url = this.forgotPasswordUrl;
        return url.startsWith('http://') || url.startsWith('https://');
    }

    get forgotPasswordTarget(): string {
        return this.fwkConfig.auth?.links?.forgotPassword?.target || '_self';
    }

    get showSignUp(): boolean {
        const linkOpt = this.fwkConfig.auth?.links?.signUp;
        if (linkOpt?.show === false) return false;
        if (linkOpt?.show === true) return true;
        return !!(linkOpt?.url || (this.fwkConfig.auth?.signUp && this.fwkConfig.auth.signUp.trim() !== ''));
    }

    get signUpUrl(): string {
        return this.fwkConfig.auth?.links?.signUp?.url || '/sign-up';
    }

    get isSignUpExternal(): boolean {
        if (this.fwkConfig.auth?.links?.signUp?.isExternal !== undefined) {
            return this.fwkConfig.auth.links.signUp.isExternal;
        }
        const url = this.signUpUrl;
        return url.startsWith('http://') || url.startsWith('https://');
    }

    get signUpTarget(): string {
        return this.fwkConfig.auth?.links?.signUp?.target || '_self';
    }

    ngOnInit(): void {
        const savedUsername = localStorage.getItem(this.REMEMBER_KEY);
        this.signInForm = this._formBuilder.group({
            username: ['', [Validators.required]],
            password: ['', Validators.required],
            rememberMe: [!!savedUsername],
        });
    }

    signIn(): void {
        if (this.signInForm.invalid) return;

        const rawValue = this.signInForm.getRawValue();
        const username = rawValue.username ?? '';

        this.signInForm.disable();
        this.showAlert = false;

        this._authService.signIn({ username: rawValue.username ?? '', password: rawValue.password ?? '', rememberMe: rawValue.rememberMe ?? false }).subscribe(
            () => {
                if (rawValue.rememberMe) {
                    localStorage.setItem(this.REMEMBER_KEY, username);
                } else {
                    localStorage.removeItem(this.REMEMBER_KEY);
                }

                const currentUser = this._userService.userValue;

                if (currentUser?.passwordExpired) {
                    this._router.navigate(['/change-password']);
                } else {
                    const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/signed-in-redirect';
                    this._router.navigateByUrl(redirectURL);
                }
            },
            (error) => {
                this.signInForm.enable();
                const fallbackMessage = this._i18nService.getDictionary('fwk')?.translate?.('sign_in_error_message') ?? 'sign_in_error_message';
                const errorMessage = error?.userMessage || error?.message || fallbackMessage;
                this.alert = {
                    type: 'error',
                    message: errorMessage
                };
                this.showAlert = true;
            }
        );
    }
}