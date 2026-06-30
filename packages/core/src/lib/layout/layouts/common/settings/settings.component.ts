import { NgClass, NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { FwkConfig, FwkConfigService, Scheme, Theme, Themes } from '../../../infrastructure/services/config';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

import { Subject, takeUntil } from 'rxjs';

@Component({
    selector     : 'settings',
    templateUrl  : './settings.component.html',
    styles       : [
        `
            settings {
                position: static;
                display: block;
                flex: none;
                width: auto;
            }

            @media (screen and min-width: 1280px) {

                empty-layout + settings .settings-cog {
                    right: 0 !important;
                }
            }
        `,
    ],
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [MatIconModule, MatButtonModule, NgFor, NgClass, MatTooltipModule, MatSidenavModule, TranslatePipe],
})
export class SettingsComponent implements OnInit, OnDestroy
{
    config!: FwkConfig;
    layout!: string;
    scheme!: 'dark' | 'light';
    theme!: string;
    themes!: Themes;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _router: Router,
        private _fwkConfigService: FwkConfigService,
    )
    {
    }

    ngOnInit(): void
    {
        this._fwkConfigService.config$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: FwkConfig) =>
            {
                this.config = config;
            });
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    setLayout(layout: string): void
    {
        this._router.navigate([], {
            queryParams        : {
                layout: null,
            },
            queryParamsHandling: 'merge',
        }).then(() =>
        {
            this._fwkConfigService.config = {layout};
        });
    }

    /**
     * Set the scheme on the config
     *
     * @param scheme
     */
    setScheme(scheme: Scheme): void
    {
        this._fwkConfigService.config = {scheme};
    }

    /**
     * Set the theme on the config
     *
     * @param theme
     */
    setTheme(theme: Theme): void
    {
        this._fwkConfigService.config = {theme};
    }
}