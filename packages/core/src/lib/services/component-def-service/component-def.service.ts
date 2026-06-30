import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { I18nService } from '../i18n-service/i18n.service';
import { FormService } from '../dynamic-form/form.service';
import { FormsDef } from '../../model/component-def/form-def';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { ComponentDef } from '../../model/component-def/component-def';
import { ToolbarComponentDef } from '../../model/component-def/toolbar-comp-def';
import { CrudDef } from '../../model/component-def/crud-def';

@Injectable({
    providedIn: 'root'
})
export class ComponentDefService {
    private charged: { [key: string]: ComponentDef } = {};
    private originalComps: ComponentDef[] = [];
    private copyComps: ComponentDef[] = [];
    private componentDefObs = new Subject<ComponentDef>();
    public componentDefObs$ = this.componentDefObs.asObservable();

    constructor(
        private i18nService: I18nService,
        private localStorageService: LocalStorageService,
        private formService: FormService
    ) { }

    getUserPermisos(): string[] {
        const user = this.localStorageService.getUserLocalStorage();
        const permisos = user?.permisos;

        if (!permisos) {
            return [];
        }

        if (Array.isArray(permisos)) {
            return permisos;
        }

        if (typeof permisos === 'string') {
            return permisos.split(';');
        }

        return [];
    }

    hasAccess(security?: string): boolean {
        if (security == null) {
            return true;
        }
        const userPermisos = this.getUserPermisos();
        return userPermisos.includes(security);
    }

    applySecurity(component: any): void {
        const userPermisos = new Set(this.getUserPermisos());

        if (component.security?.createAccess && !userPermisos.has(component.security.createAccess)) {
            delete component.formsDef?.create;
            if (component.forms) delete component.forms.create;
        }
        if (component.security?.updateAccess && !userPermisos.has(component.security.updateAccess)) {
            delete component.formsDef?.update;
            if (component.forms) delete component.forms.update;
        }
        if (component.security?.deleteAccess && !userPermisos.has(component.security.deleteAccess)) {
            if (component.grid) {
                component.grid.deleteAction = false;
                delete component.grid.deleteColumn;
            }
        }
        if (component.grid?.actions) {
            component.grid.actions = component.grid.actions.filter((action: any) =>
                !action.actionSecurity || userPermisos.has(action.actionSecurity)
            );
        }
    }

    create(componentDef: ComponentDef): void {
        this.getByName(componentDef.name).pipe(take(1)).subscribe(existing => {
            if (!existing) {
                this.componentDefObs.next(componentDef);
            }
        });
    }

    getComponentDefByUrl(url: string): ComponentDef | undefined {
        const components = this.getComponents();
        return components?.find(c => c.navigation?.url === url);
    }

    getByName(componentName: string): Observable<ComponentDef | null> {
        if (!componentName) {
            return of(null);
        }
        if (this.charged[componentName]) {
            return of(this.localStorageService.clone(this.charged[componentName]));
        }

        const componentDef = this.findComponentInMemory(componentName);
        if (!componentDef) {
            return of(null);
        }

        if (componentDef.i18n) {
            return this.i18nService.getByName(componentDef.i18n.name).pipe(
                map(i18n => {
                    if (i18n) {
                        componentDef.i18n = i18n;
                        this.processComponentDef(componentDef);
                        this.charged[componentName] = componentDef;
                        return this.localStorageService.clone(componentDef);
                    }
                    return componentDef;
                })
            );
        } else {
            this.charged[componentName] = componentDef;
            return of(this.localStorageService.clone(componentDef));
        }
    }

    private processComponentDef(componentDef: ComponentDef): void {
        this.setUpkeysi18n(componentDef as CrudDef);
        this.setUpUrls(componentDef);
        if ('contextMenu' in componentDef) {
            this.setToolbarData(componentDef as ToolbarComponentDef);
        }
    }

    setToolbarData(componentDef: ToolbarComponentDef): void {
        componentDef.contextMenu?.forEach(ctx => {
            if (ctx.labelKey && componentDef.i18n) {
                ctx.label = componentDef.i18n?.translate?.(ctx.labelKey);
            }
        });
    }

    setUpUrls(componentDef: ComponentDef): void {
        if (componentDef.ws) {
        }
    }

    getUrlNavById(id: string): string | undefined {
        return undefined;
    }

    private findUrlInNav(id: string, navItem: any): string | undefined {
        if (navItem.id === id) {
            return navItem.url;
        }
        if (navItem.children) {
            for (const child of navItem.children) {
                const url = this.findUrlInNav(id, child);
                if (url) return url;
            }
        }
        return undefined;
    }

    getComponents(): ComponentDef[] {
        return this.localStorageService.clone(this.copyComps);
    }

    setComponentUser(components: ComponentDef[]): void {
        this.originalComps = components;
        this.resetComponent();
        this.charged = {};
    }

    resetComponent(): void {
        this.copyComps = this.localStorageService.clone(this.originalComps) ?? [];
    }


    private setUpkeysi18n(componentDef: CrudDef): void {
        if (!componentDef.i18n) return;

        if (componentDef.formsDef) {
            this.setUpkeysi18nOfFormsDef(componentDef.i18n, componentDef.formsDef);
        }
        if (componentDef.actions) {
            this.formService.setUpActionsFromI18n(componentDef.i18n, componentDef.actions);
        }
        if (componentDef.dialogs) {
            this.formService.setUpDialogsFromI18n(componentDef.i18n, componentDef.dialogs);
        }
        if (componentDef.forms) {
            if (componentDef.forms.create) this.formService.setUpFieldTextFromI18n(componentDef.i18n, componentDef.forms.create);
            if (componentDef.forms.filter) this.formService.setUpFieldTextFromI18n(componentDef.i18n, componentDef.forms.filter);
            if (componentDef.forms.read) this.formService.setUpFieldTextFromI18n(componentDef.i18n, componentDef.forms.read);
            if (componentDef.forms.update) this.formService.setUpFieldTextFromI18n(componentDef.i18n, componentDef.forms.update);
            if (componentDef.forms.updateBehavior) this.formService.setUpBehaviorTextFromI18n(componentDef.i18n, componentDef.forms.updateBehavior);
            if (componentDef.forms.createBehavior) this.formService.setUpBehaviorTextFromI18n(componentDef.i18n, componentDef.forms.createBehavior);
        }
        if (componentDef.grid) {
            this.formService.setUpkeysi18nOfGrid(componentDef.i18n, componentDef.grid);
        }
        if (componentDef.crudActions) {
            this.formService.setUpActionsFromI18n(componentDef.i18n, componentDef.crudActions);
        }
    }

    private setUpkeysi18nOfFormsDef(i18n: any, formsDef: FormsDef): void {
        if (formsDef.create) this.formService.setUpFormDef(i18n, formsDef.create);
        if (formsDef.update) this.formService.setUpFormDef(i18n, formsDef.update);
        if (formsDef.filter) this.formService.setUpFormDef(i18n, formsDef.filter);
        if (formsDef.read) this.formService.setUpFormDef(i18n, formsDef.read);
    }

    private findComponentInMemory(byName: string): ComponentDef | undefined {
        return this.copyComps?.find(e => e.name === byName);
    }

    filterNavArrayBySecurity(navArray: any[], allowedSecurityValues: string[]): any[] {
        if (!navArray) return [];
        return navArray
            .map(nav => this.filterNavByPermission(nav, new Set(allowedSecurityValues)))
            .filter(nav => nav !== null);
    }

    private filterNavByPermission(nav: any, allowedSecurityValues: Set<string>): any | null {
        if (nav.permission && !allowedSecurityValues.has(nav.permission)) {
            return null;
        }
        const navClone = { ...nav };
        if (navClone.children) {
            navClone.children = navClone.children
                .map((child: any) => this.filterNavByPermission(child, allowedSecurityValues))
                .filter((child: any) => child !== null);

            if (navClone.children.length === 0) {
                delete navClone.children;
            }
        }
        return navClone;
    }
}