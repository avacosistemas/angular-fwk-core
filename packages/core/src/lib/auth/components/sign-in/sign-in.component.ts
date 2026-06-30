import { NgIf } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
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
import { FWK_CONFIG, FwkConfig } from '../../../model/fwk-config';
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
    imports: [RouterLink, FwkAlertComponent, NgIf, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressSpinnerModule, TranslatePipe, LogoComponent],
})
export class AuthSignInComponent implements OnInit {
    @ViewChild('signInNgForm') signInNgForm!: NgForm;

    public fwkConfig = inject<FwkConfig>(FWK_CONFIG);

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
    showForgotPassword = false;

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _router: Router
    ) { }

    ngOnInit(): void {
        const savedUsername = localStorage.getItem(this.REMEMBER_KEY);
        this.showForgotPassword = !!this.fwkConfig.auth?.forgotPassword && this.fwkConfig.auth.forgotPassword.trim() !== '';
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
                this.alert = {
                    type: 'error',
                    message: this._i18nService.getDictionary('fwk')?.translate?.('sign_in_error_message') ?? 'sign_in_error_message'
                };
                this.showAlert = true;
            }
        );
    }
}