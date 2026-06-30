import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { I18n } from '../../model/i18n';
import { I18nService } from '../i18n-service/i18n.service';
import { ComponentDef } from '../../model/component-def/component-def';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { ComponentDefService } from '../component-def-service/component-def.service';

export interface NavigationItem {
    id?: string;
    title: string;
    type: 'item' | 'group' | 'collapse';
    translate?: string;
    translateKey?: string;
    icon?: string;
    url?: string;
    permission?: string;
    children?: NavigationItem[];
}

@Injectable({
    providedIn: 'root'
})
export class NavigationService {
    private i18n!: I18n;

    private navigationState = new BehaviorSubject<NavigationItem[]>([]);
    public navigation$ = this.navigationState.asObservable();

    constructor(
        private i18nService: I18nService,
        private localStorageService: LocalStorageService,
        private componentDefService: ComponentDefService
    ) {
        this.i18nService.getByName('navigation').pipe(take(1)).subscribe(i18n => {
            this.i18n = i18n || new I18n();
        });
    }

    setNavigation(nav: NavigationItem[]): void {
        const navClone = this.localStorageService.clone(nav);
        const userPermisos = this.componentDefService.getUserPermisos();
        const filteredNav = this.componentDefService.filterNavArrayBySecurity(navClone, userPermisos);
        const sortedNav = this.sortItemsByType(filteredNav);
        this.navigationState.next(this.filterOrphans(sortedNav));
    }

    setUpByMappingComponent(components: ComponentDef[]): void {
        if (!components || components.length === 0) {
            return;
        }

        const i18nObservables$ = components.map(component =>
            this.i18nService.getByName(component.i18n.name).pipe(
                map(i18n => ({ component, i18n }))
            )
        );

        forkJoin(i18nObservables$).pipe(take(1)).subscribe(results => {
            let currentNav = this.localStorageService.clone(this.navigationState.getValue());

            results.forEach(({ component, i18n }) => {
                if (component.navigation?.translateKey && i18n) {
                    component.navigation.translate = i18n.translate?.(component.navigation.translateKey) ?? component.navigation.translateKey;
                }
            });

            const sortedNav = this.sortItemsByType(currentNav);
            this.navigationState.next(this.filterOrphans(sortedNav));
        });
    }

    removeNavigation(navDef: NavigationItem): void {
        const currentNav = this.navigationState.getValue();
        const newNav = this.recursiveRemove(currentNav, navDef);
        const sortedNav = this.sortItemsByType(newNav);
        this.navigationState.next(this.filterOrphans(sortedNav));
    }

    private sortItemsByType(items: NavigationItem[]): NavigationItem[] {
        if (!items) {
            return [];
        }

        const processedItems = items.map(item => {
            if (item.children && item.children.length > 0) {
                return {
                    ...item,
                    children: this.sortItemsByType(item.children)
                };
            }
            return item;
        });

        processedItems.sort((a, b) => {
            const weightA = a.type === 'item' ? 1 : 0;
            const weightB = b.type === 'item' ? 1 : 0;

            return weightA - weightB;
        });

        return processedItems;
    }

    private filterOrphans(items: NavigationItem[]): NavigationItem[] {
        if (!items) return [];

        return items
            .map(item => {
                if (item.children && item.children.length > 0) {
                    const filteredChildren = this.filterOrphans(item.children);
                    return { ...item, children: filteredChildren };
                }
                return item;
            })
            .filter(item => {
                if (item.type === 'item') {
                    return true;
                }
                return item.children && item.children.length > 0;
            });
    }

    private recursiveRemove(items: NavigationItem[], navDefToRemove: NavigationItem): NavigationItem[] {
        if (!items || !navDefToRemove.id) return items;

        return items
            .filter(item => item.id !== navDefToRemove.id)
            .map(item => {
                if (item.children) {
                    return { ...item, children: this.recursiveRemove(item.children, navDefToRemove) };
                }
                return item;
            });
    }
}