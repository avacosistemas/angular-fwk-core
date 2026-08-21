import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BooleanInput } from '@angular/cdk/coercion';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../auth/user.types';
import { UserService } from '../../../../auth/user.service';
import { AuthService } from '../../../../auth/auth.service';
import { formatImageSrc } from '../../../../utils/image-utils';

import { FwkConfig, FwkConfigService, Scheme } from '../../../infrastructure/services/config';

import { NgIf, NgClass, NgComponentOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslatePipe } from '../../../../pipe/translate.pipe';
import { FWK_CONFIG as APP_FWK_CONFIG, FWK_USER_MENU_CUSTOM_COMPONENT } from '../../../../model/fwk-config';
import { Type } from '@angular/core';

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
        NgComponentOutlet,
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
    avatarBroken: boolean = false;

    private readonly THEME_STORAGE_KEY = 'Fwk-theme-scheme';
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private _appConfig = inject(APP_FWK_CONFIG);
    private _injectedCustomUserMenuComponent = inject(FWK_USER_MENU_CUSTOM_COMPONENT, { optional: true });

    customUserMenuComponent: Type<any> | null = this._injectedCustomUserMenuComponent ?? this._appConfig.customUserMenuComponent ?? null;

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
                this.avatarBroken = false;
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

    get avatarSrc(): string | null {
        if (this.avatarBroken) return null;
        const photo = this.user?.avatar || this.user?.foto || this.user?.imagen;
        if (!photo) return null;
        return formatImageSrc(photo);
    }

    onAvatarError(): void {
        this.avatarBroken = true;
        this._changeDetectorRef.markForCheck();
    }

    get userInitials(): string {
        const name = this.user?.name || this.user?.username || this.user?.user || '';
        if (!name) return 'U';

        if (name.includes(',')) {
            const parts = name.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
                return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
            }
            return parts[0].charAt(0).toUpperCase();
        }

        const words = name.trim().split(/\s+/).filter(Boolean);
        if (words.length >= 2) {
            return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
        }
        return words[0]?.charAt(0).toUpperCase() || 'U';
    }

    signOut(): void {
        this._router.navigate(['/sign-out']);
    }

    /**
     * @param scheme
     */
    setScheme(scheme: Scheme): void {
        this._fwkConfigService.config = { scheme };
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