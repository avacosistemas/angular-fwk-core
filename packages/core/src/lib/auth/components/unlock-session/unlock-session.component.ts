import { NgIf, NgStyle } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule, NgForm, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { FwkAlertComponent, FwkAlertType } from '../../../layout/infrastructure/components/alert';
import { AuthService } from '../../auth.service';
import { UserService } from '../../user.service';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { LogoComponent } from '../../../components/logo/logo.component';
import { FWK_CONFIG, FwkConfig } from '../../../model/fwk-config';

interface UnlockSessionForm {
    name: FormControl<string | null>;
    password: FormControl<string | null>;
}

@Component({
    selector     : 'auth-unlock-session',
    templateUrl  : './unlock-session.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fwkAnimations,
    standalone   : true,
    imports      : [NgIf, NgStyle, FwkAlertComponent, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink, TranslatePipe, LogoComponent],
})
export class AuthUnlockSessionComponent implements OnInit
{
    @ViewChild('unlockSessionNgForm') unlockSessionNgForm!: NgForm;

    public fwkConfig = inject<FwkConfig>(FWK_CONFIG);

    alert: { type: FwkAlertType; message: string } = {
        type   : 'success',
        message: '',
    };
    name: string = '';
    showAlert: boolean = false;
    unlockSessionForm!: FormGroup<UnlockSessionForm>;
    private _email: string = '';
    private _i18nService = inject(I18nService);

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: FormBuilder, 
        private _router: Router,
        private _userService: UserService,
    )
    {
    }

    ngOnInit(): void
    {
        this._userService.user$.subscribe((user) =>
        {
            this.name = user.name;
            this._email = user.email;
        });

        this.unlockSessionForm = this._formBuilder.group({
            name    : [
                {
                    value   : this.name,
                    disabled: true,
                },
            ],
            password: ['', Validators.required],
        });
    }

    unlock(): void
    {
        if ( this.unlockSessionForm.invalid )
        {
            return;
        }

        this.unlockSessionForm.disable();
        this.showAlert = false;

        this._authService.unlockSession({
            email   : this._email ?? '',
            password: this.unlockSessionForm.get('password')?.value ?? '',
        }).subscribe(
            () =>
            {
                const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/signed-in-redirect';
                this._router.navigateByUrl(redirectURL);
            },
            (response) =>
            {
                this.unlockSessionForm.enable();
                this.unlockSessionNgForm.resetForm({
                    name: {
                        value   : this.name,
                        disabled: true,
                    },
                });

                const fallback = this._i18nService.translate('unlock_session_invalid_password');
                this.alert = {
                    type   : 'error',
                    message: response?.userMessage || response?.message || fallback,
                };

                this.showAlert = true;
            },
        );
    }
}