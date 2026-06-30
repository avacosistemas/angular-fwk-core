import { Directive, Injector, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { FwkConfig, FwkConfigService } from '../layout/infrastructure/services/config';
import { I18nService } from '../services/i18n-service/i18n.service';
import { I18n } from '../model/i18n';
import { NotificationService } from '../services/notification/notification.service';
import { ComponentDefService } from '../services/component-def-service/component-def.service';
import { ComponentDef } from '../model/component-def/component-def';

@Directive()
export abstract class AbstractComponent implements OnInit, OnDestroy {

    protected i18nService: I18nService;
    protected notificationService: NotificationService;
    protected componentDefService: ComponentDefService;
    protected router: Router;
    protected fwkConfigService: FwkConfigService;

    private _fwkConfigSubscription: Subscription;

    fwkConfig: FwkConfig;
    i18n?: I18n;
    i18nName: string = 'fwk';
    i18nLoaded: boolean = false;
    name: string = '';
    componentDef?: ComponentDef;

    constructor(injector: Injector) {
        this.i18nService = injector.get(I18nService);
        this.notificationService = injector.get(NotificationService);
        this.componentDefService = injector.get(ComponentDefService);
        this.router = injector.get(Router);
        this.fwkConfigService = injector.get(FwkConfigService);

        this.fwkConfig = this.fwkConfigService.config;
        this._fwkConfigSubscription = this.fwkConfigService.config$.subscribe(config => {
            this.fwkConfig = config;
        });
    }

    ngOnInit(): void {
        const i18nNameToLoad = this.getI18nName();
        if (i18nNameToLoad) {
            this.i18nService.getByName(i18nNameToLoad).subscribe(
                i18n => {
                    this.i18n = i18n;
                    this.i18nLoaded = true;
                }
            );
        } else {
            this.i18nLoaded = true;
        }
    }

    ngOnDestroy(): void {
        this._fwkConfigSubscription?.unsubscribe();
    }

    getI18nName(): string {
        return this.i18nName;
    }

    getName(): string {
        return this.name;
    }

    setUpI18n(i18n: I18n): void {
        this.i18nService.addI18n(i18n);
    }

    setUpComponentDef(componentDef: ComponentDef): void {
        this.componentDef = componentDef;
        this.name = componentDef.name;
        this.componentDefService.create(componentDef);
    }

    translate(key: string): string {
        if (!key) return '';

        const specificDict = this.i18nService.getDictionary(this.getI18nName());
        let translation = specificDict?.translate?.(key);

        if (!translation || translation === key) {
            const fwkDict = this.i18nService.getDictionary('fwk');
            translation = fwkDict?.translate?.(key);
        }

        return translation || key;
    }

    navigateWithInjector(url: string, param: Record<string, any>, injector: Injector): void {
        const router = injector.get(Router);
        router.navigateByUrl(this.buildURL(url, param));
    }

    navigate(url: string, param: Record<string, any>): void {
        this.router.navigateByUrl(this.buildURL(url, param));
    }

    private buildURL(url: string, param: Record<string, any> | null): string {
        let finalUrl = url;
        if (param) {
            Object.keys(param).forEach(key => {
                const placeholder = `:${key}`;
                if (finalUrl.includes(placeholder)) {
                    finalUrl = finalUrl.replace(new RegExp(placeholder, 'g'), param[key]);
                }
            });
        }
        return finalUrl.startsWith('/') ? finalUrl : `/${finalUrl}`;
    }
}