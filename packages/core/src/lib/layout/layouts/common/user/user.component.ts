import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BooleanInput } from '@angular/cdk/coercion';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../auth/user.types';
import { UserService } from '../../../../auth/user.service';
import { AuthService } from '../../../../auth/auth.service';

import { FwkConfig, FwkConfigService, Scheme } from '../../../infrastructure/services/config';

import { NgIf, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslatePipe } from '../../../../pipe/translate.pipe';
import { FWK_CONFIG as APP_FWK_CONFIG } from '../../../../model/fwk-config';

@Component({
    selector: 'user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        NgIf,
        NgClass,
        MatButtonModule,
        MatMenuModule,
        MatIconModule,
        MatDividerModule,
        MatTooltipModule,
        MatButtonToggleModule,
        TranslatePipe,
    ],
})
export class UserComponent implements OnInit, OnDestroy {
    static ngAcceptInputType_showAvatar: BooleanInput;

    @Input() showAvatar: boolean = true;
    user!: User;
    config!: FwkConfig;
    showChangePassword = false;

    private readonly THEME_STORAGE_KEY = 'Fwk-theme-scheme';
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private _appConfig = inject(APP_FWK_CONFIG);

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _router: Router,
        private _userService: UserService,
        private _authService: AuthService,
        private _fwkConfigService: FwkConfigService,
    ) {
    }

    ngOnInit(): void {
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                this.user = user;
                this._changeDetectorRef.markForCheck();
            });

        this._fwkConfigService.config$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: FwkConfig) => {
                this.config = config;
                this._changeDetectorRef.markForCheck();
            });

        this.showChangePassword = !!this._appConfig.auth?.changePassword && this._appConfig.auth.changePassword.trim() !== '';
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    signOut(): void {
        this._router.navigate(['/sign-out']);
    }

    /**
     * @param scheme
     */
    setScheme(scheme: Scheme): void {
        this._fwkConfigService.config = { scheme };

        try {
            localStorage.setItem(this.THEME_STORAGE_KEY, scheme);
        } catch (e) {
            console.error('No se pudo guardar la preferencia de tema en localStorage.', e);
        }
    }

    changePassword(): void {
        this._router.navigate(['/change-password']); 
    }

    toggleFullscreen(): void {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
}