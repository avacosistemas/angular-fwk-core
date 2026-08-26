import { NgIf } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { LogoComponent } from '../../../components/logo/logo.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'auth-sso',
    templateUrl: './sso.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [NgIf, TranslatePipe, LogoComponent, MatProgressSpinnerModule],
})
export class AuthSsoComponent implements OnInit {
    private _route = inject(ActivatedRoute);
    private _router = inject(Router);
    private _authService = inject(AuthService);

    ngOnInit(): void {
        const returnUrl = this._route.snapshot.queryParams['returnUrl'];
        if (!returnUrl) {
            this._router.navigate(['/']);
            return;
        }

        const token = this._authService.getToken();

        if (token) {
            const separator = returnUrl.includes('?') ? '&' : '?';
            window.location.href = `${returnUrl}${separator}token=${encodeURIComponent(token)}`;
        } else {
            const currentSsoUrl = `/sso?returnUrl=${encodeURIComponent(returnUrl)}`;
            this._router.navigate(['/sign-in'], {
                queryParams: { redirectURL: currentSsoUrl }
            });
        }
    }
}
