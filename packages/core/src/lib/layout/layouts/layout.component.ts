import { DOCUMENT, NgIf } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, Renderer2, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { FwkConfig, FwkConfigService } from '../infrastructure/services/config';
import { FwkMediaWatcherService } from '../infrastructure/services/media-watcher';
import { FwkPlatformService } from '../infrastructure/services/platform';
import { combineLatest, filter, map, Subject, takeUntil } from 'rxjs';
import { SettingsComponent } from './common/settings/settings.component';
import { EmptyLayoutComponent } from './empty/empty.component';
import { DenseLayoutComponent } from './vertical/dense/dense.component';
@Component({
    selector     : 'layout',
    templateUrl  : './layout.component.html',
    styleUrls    : ['./layout.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [NgIf, EmptyLayoutComponent, DenseLayoutComponent, SettingsComponent],
})
export class LayoutComponent implements OnInit, OnDestroy
{
    config!: FwkConfig;
    layout!: string;
    scheme!: 'dark' | 'light';
    theme!: string;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        @Inject(DOCUMENT) private _document: any,
        private _renderer2: Renderer2,
        private _router: Router,
        private _fwkConfigService: FwkConfigService,
        private _fwkMediaWatcherService: FwkMediaWatcherService,
        private _fwkPlatformService: FwkPlatformService,
    )
    {
    }

    /**
     * On init
     */
    ngOnInit(): void
    {
        combineLatest([
            this._fwkConfigService.config$,
            this._fwkMediaWatcherService.onMediaQueryChange$(['(prefers-color-scheme: dark)', '(prefers-color-scheme: light)']),
        ]).pipe(
            takeUntil(this._unsubscribeAll),
            map(([config, mql]) =>
            {
                const options = {
                    scheme: config.scheme,
                    theme : config.theme,
                };

                if ( config.scheme === 'auto' )
                {
                    options.scheme = mql.breakpoints['(prefers-color-scheme: dark)'] ? 'dark' : 'light';
                }

                return options;
            }),
        ).subscribe((options) =>
        {
            this.scheme = options.scheme;
            this.theme = options.theme;

            this._updateScheme();
            this._updateTheme();
        });

        this._fwkConfigService.config$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: FwkConfig) =>
            {
                this.config = config;
                this._updateLayout();
            });

        this._router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntil(this._unsubscribeAll),
        ).subscribe(() =>
        {
            this._updateLayout();
        });

        this._renderer2.addClass(this._document.body, this._fwkPlatformService.osName);
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    private _updateLayout(): void
    {
        let route = this._activatedRoute;
        while ( route.firstChild )
        {
            route = route.firstChild;
        }

        this.layout = this.config.layout;

        const layoutFromQueryParam = route.snapshot.queryParamMap.get('layout');
        if ( layoutFromQueryParam )
        {
            this.layout = layoutFromQueryParam;
            if ( this.config )
            {
                this.config.layout = layoutFromQueryParam;
            }
        }

        const paths = route.pathFromRoot;
        paths.forEach((path) =>
        {
            if ( path.routeConfig && path.routeConfig.data && path.routeConfig.data.layout )
            {
                this.layout = path.routeConfig.data.layout;
            }
        });
    }

    /**
     * Update the selected scheme
     *
     * @private
     */
    private _updateScheme(): void
    {
        this._document.body.classList.remove('light', 'dark');
        this._document.body.classList.add(this.scheme);
    }

    /**
     * Update the selected theme
     *
     * @private
     */
    private _updateTheme(): void
    {
        this._document.body.classList.forEach((className: string) =>
        {
            if ( className.startsWith('theme-') )
            {
                this._document.body.classList.remove(className, className.split('-')[1]);
            }
        });

        this._document.body.classList.add(this.theme);
    }
}