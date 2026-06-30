import { I18nPluralPipe, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { timer, takeWhile, tap, finalize, switchMap, Subject, takeUntil } from 'rxjs';
import { LogoComponent } from '../../../components/logo/logo.component';
import { FWK_CONFIG } from '../../../model/fwk-config';

@Component({
    selector: 'auth-sign-out',
    templateUrl: './sign-out.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [NgIf, RouterLink, I18nPluralPipe, TranslatePipe, LogoComponent],
})
export class AuthSignOutComponent implements OnInit, OnDestroy {
    countdown: number = 3;
    countdownMessage: string = '';
    countdownMapping: any = {};
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private _authService = inject(AuthService);
    private _router = inject(Router);
    private _i18nService = inject(I18nService);
    private _fwkConfig = inject(FWK_CONFIG);

    public fallbackRedirectUrl = '/sign-in';

    constructor() { }

    ngOnInit(): void {
        this.countdownMapping = {
            '=1': this._i18nService.translate('sign_out_countdown_one'),
            'other': this._i18nService.translate('sign_out_countdown_other'),
        };
        this.updateCountdownMessage();

        this._authService.signOut().pipe(
            switchMap(() => timer(1000, 1000)),
            takeWhile(() => this.countdown > 0),
            tap(() => {
                this.countdown--;
                this.updateCountdownMessage();
            }),
            finalize(() => {
                const targetUrl = this._fwkConfig.routing.redirectOnLogout || this.fallbackRedirectUrl;
                window.location.assign(targetUrl);
            }),
            takeUntil(this._unsubscribeAll)
        ).subscribe();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    private updateCountdownMessage(): void {
        const baseMessage = this._i18nService.translate('sign_out_redirect_countdown');
        this.countdownMessage = baseMessage.replace('{{countdown}}', this.countdown.toString());
    }

    manualRedirect(): void {
        this.countdown = 0;
        const targetUrl = this._fwkConfig.routing.redirectOnLogout || this.fallbackRedirectUrl;
        window.location.assign(targetUrl);
    }
}