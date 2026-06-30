import { Inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';
import { NavigationService } from '../navigation.service';
import { I18nService } from '../../services/i18n-service/i18n.service';
import { CrudDef } from '../../model/component-def/crud-def';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';

export interface Breadcrumb {
    label: string;
    url: string;
    queryParams?: any;
    icon?: string;
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
    private _breadcrumbs = new BehaviorSubject<Breadcrumb[]>([]);
    breadcrumbs$ = this._breadcrumbs.asObservable();
    
    private _lastKnownUrls = new Map<string, string>();

    constructor(
        private _router: Router,
        private _navigationService: NavigationService,
        private _i18nService: I18nService,
        @Inject(FWK_CONFIG) private _fwkConfig: FwkConfig,
    ) {
        this._router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
            this._updateBreadcrumbs(event.urlAfterRedirects);
        });

        this._navigationService.navigation$.subscribe(() => {
            this._updateBreadcrumbs(this._router.url);
        });
    }

    private _updateBreadcrumbs(url: string): void {
        const urlWithoutParams = url.split('?')[0].toLowerCase();
        const hasParams = url.includes('?');
        const currentCrudDef = this._navigationService.getCrudDefByUrl(url);
        const menuItem = this._navigationService.getNavigationItemByUrl(url);
        
        if (currentCrudDef && currentCrudDef.navigation?.url) {
            const navUrl = currentCrudDef.navigation.url.split('?')[0].toLowerCase();
            
            const isMenuNavigation = menuItem && menuItem.type === 'basic' && !hasParams;
            
            if (isMenuNavigation) {
                this._lastKnownUrls.set(navUrl, url);
                
                this._lastKnownUrls.forEach((val, key) => {
                    if (key !== navUrl && key.includes(navUrl)) {
                         this._lastKnownUrls.delete(key);
                    }
                });
            } else {
                this._lastKnownUrls.set(navUrl, url);
            }
        } else {
            this._lastKnownUrls.set(urlWithoutParams, url);
        }

        const breadcrumbs: Breadcrumb[] = [];
        
        const homeUrl = this._fwkConfig.routing.welcomeDashboard ? '/welcome' : (this._fwkConfig.routing.defaultRedirect || '/');
        const cleanHomeUrl = homeUrl.split('?')[0].toLowerCase().replace(/^\/+|\/+$/g, '');

        if (urlWithoutParams !== cleanHomeUrl && urlWithoutParams !== '/' && urlWithoutParams !== 'welcome') {
            breadcrumbs.push(this._createBreadcrumb(this._i18nService.translate('breadcrumb_home'), homeUrl, 'heroicons_outline:home'));
        }

        if (currentCrudDef) {
            this._buildHiearchy(currentCrudDef, breadcrumbs, url);
        } else {
            const segments = urlWithoutParams.split('/').filter(s => !!s);
            if (segments.length > 0 && segments[0] !== 'welcome') {
                const label = segments[segments.length - 1];
                breadcrumbs.push(this._createBreadcrumb(label, this._getStoredUrl(urlWithoutParams)));
            }
        }

        this._breadcrumbs.next(breadcrumbs);
    }

    private _buildHiearchy(def: CrudDef, breadcrumbs: Breadcrumb[], currentUrl: string): void {
        const path: Breadcrumb[] = [];
        const basePath = def.navigation?.url || '';

        if (basePath) {
            const parentsByUrl = this._navigationService.allCrudDefs.filter(d => {
                const navUrl = d.navigation?.url;
                if (!navUrl) return false;
                
                const cleanCurrent = basePath.split('?')[0].toLowerCase();
                const cleanNav = navUrl.split('?')[0].toLowerCase();

                return cleanCurrent === cleanNav || cleanCurrent.startsWith(cleanNav + '/');
            });

            if (parentsByUrl.length > 1) {
                parentsByUrl.sort((a, b) => {
                    const lenA = a.navigation!.url.split('?')[0].length;
                    const lenB = b.navigation!.url.split('?')[0].length;
                    return lenA - lenB;
                });

                parentsByUrl.forEach(d => {
                    path.push(this._createBreadcrumbForDef(d));
                });

                breadcrumbs.push(...path);
                return;
            }
        }

        let currentDef: CrudDef | undefined = def;
        const visitedIds = new Set<string>();

        while (currentDef) {
            const nav = currentDef.navigation;
            if (!nav) break;

            if (visitedIds.has(nav.id)) break;
            visitedIds.add(nav.id);

            path.unshift(this._createBreadcrumbForDef(currentDef));

            if (nav.activeItemId && nav.activeItemId !== nav.id) {
                let nextId = this._resolveParentId(currentDef, currentUrl);
                currentDef = this._navigationService.allCrudDefs.find(d => d.navigation?.id === nextId);
            } else {
                currentDef = undefined;
            }
        }

        breadcrumbs.push(...path);
    }

    private _resolveParentId(currentDef: CrudDef, currentUrl: string): string | undefined {
        const nav = currentDef.navigation;
        if (!nav) return undefined;

        const parts = currentUrl.split('?');
        if (parts.length < 2) return nav.activeItemId;

        const queryParams: Record<string, string> = {};
        parts[1].split('&').forEach(p => {
            const [k, v] = p.split('=');
            if (k) queryParams[k] = v;
        });

        const allDefs = this._navigationService.allCrudDefs;
        const currentId = nav.id.toLowerCase();
        const currentWS = currentDef.ws?.url?.split('/').pop()?.toLowerCase() || '';
        const currentIdColColumn = currentDef.grid?.columnsDef?.find(col => col.id === true);
        const currentIdCol = currentIdColColumn?.columnDef?.toLowerCase();

        let bestMatch: { id: string, score: number } | null = null;

        for (const key of Object.keys(queryParams)) {
            const k = key.toLowerCase();
            if (!k.startsWith('id') || k.length <= 2) continue;

            const paramResourceName = k.substring(2);
            
            if (paramResourceName === currentId || paramResourceName === currentWS || k === currentIdCol) continue;

            for (const d of allDefs) {
                if (!d.navigation) continue;
                
                const dNavId = d.navigation.id.toLowerCase();
                const dWS = d.ws?.url?.split('/').pop()?.toLowerCase() || '';

                const idColumn = d.grid?.columnsDef?.find(col => col.id === true);
                const idColName = idColumn?.columnDef?.toLowerCase();

                if (paramResourceName === dNavId || paramResourceName === dWS || k === idColName) {
                    const score = Math.max(paramResourceName.length, idColName?.length || 0);
                    if (!bestMatch || score > bestMatch.score) {
                        bestMatch = { id: d.navigation.id, score };
                    }
                }
            }
        }

        return bestMatch ? bestMatch.id : nav.activeItemId;
    }

    private _createBreadcrumbForDef(def: CrudDef): Breadcrumb {
        const nav = def.navigation!;
        let label = nav.translateKey ? this._i18nService.translate(nav.translateKey) : (def.name || 'Página');

        return this._createBreadcrumb(label, this._getStoredUrl(nav.url || ''), nav.icon);
    }

    private _createBreadcrumb(label: string, fullUrl: string, icon?: string): Breadcrumb {
        const [url, queryString] = fullUrl.split('?');
        const queryParams: any = {};
        
        if (queryString) {
            queryString.split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key) {
                    queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
                }
            });
        }

        return {
            label,
            url,
            queryParams,
            icon
        };
    }

    private _getStoredUrl(basePath: string): string {
        const cleanPath = basePath.split('?')[0].toLowerCase();
        let stored = this._lastKnownUrls.get(cleanPath);
        return stored || basePath;
    }
}