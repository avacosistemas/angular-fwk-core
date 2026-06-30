import { NgIf } from '@angular/common';
import { Component, OnInit, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { FwkAlertComponent, FwkAlertType } from '../../../layout/infrastructure/components/alert';
import { AuthService } from '../../auth.service';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { LogoComponent } from '../../../components/logo/logo.component';

interface SignUpForm {
    name: FormControl<string | null>;
    email: FormControl<string | null>;
    password: FormControl<string | null>;
    company: FormControl<string | null>;
    agreements: FormControl<boolean | null>;
}

@Component({
    selector     : 'auth-sign-up',
    templateUrl  : './sign-up.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fwkAnimations,
    standalone   : true,
    imports      : [RouterLink, NgIf, FwkAlertComponent, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressSpinnerModule, TranslatePipe, LogoComponent],
})
export class AuthSignUpComponent implements OnInit
{
    @ViewChild('signUpNgForm') signUpNgForm!: NgForm;

    private _authService = inject(AuthService);
    private _formBuilder = inject(FormBuilder);
    private _router = inject(Router);
    private _i18nService = inject(I18nService);

    alert: { type: FwkAlertType; message: string } = {
        type   : 'success',
        message: '',
    };

    signUpForm!: FormGroup<SignUpForm>;
    showAlert: boolean = false;

    constructor() {}

    ngOnInit(): void
    {
        this.signUpForm = this._formBuilder.group({
                name      : ['', Validators.required],
                email     : ['', [Validators.required, Validators.email]],
                password  : ['', Validators.required],
                company   : [''],
                agreements: [false, Validators.requiredTrue],
            },
        );
    }

    signUp(): void
    {
        if ( this.signUpForm.invalid )
        {
            return;
        }

        this.signUpForm.disable();
        this.showAlert = false;

        this._authService.signUp(this.signUpForm.getRawValue())
            .subscribe(
                (response) =>
                {
                    this._router.navigateByUrl('/confirmation-required');
                },
                (response) =>
                {
                    this.signUpForm.enable();
                    this.signUpNgForm.resetForm();

                    this.alert = {
                        type   : 'error',
                        message: this._i18nService.getDictionary('fwk')?.translate?.('generic_error_try_again') ?? 'generic_error_try_again',
                    };

                    this.showAlert = true;
                },
            );
    }
}