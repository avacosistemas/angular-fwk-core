import { Injectable, Inject } from '@angular/core';
import { Observable, of, ReplaySubject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { CrudDef } from '../../model/component-def/crud-def';
import { FWK_CRUD_MODULES_LOADER } from '../../navigation/navigation.tokens';
import { AbstractAuthService } from '../../auth/abstract-auth.service';
import { I18nService } from '../i18n-service/i18n.service';

export interface SearchResult {
    title: string;
    breadcrumb: string[];
    link: string;
    keywords: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
    private searchablePages = new ReplaySubject<SearchResult[]>(1);
    private searchablePages$: Observable<SearchResult[]> = this.searchablePages.asObservable();
    private isBuildingIndex = false;

    constructor(
        @Inject(FWK_CRUD_MODULES_LOADER) private crudModulesLoader: () => Promise<any>,
        private authService: AbstractAuthService,
        private i18nService: I18nService
    ) {
        this.authService.authenticated$.pipe(
            filter(isAuthenticated => isAuthenticated)
        ).subscribe(() => {
            this.buildSearchIndex();
        });
        
        this.authService.authenticated$.pipe(
            filter(isAuthenticated => !isAuthenticated)
        ).subscribe(() => {
            this.searchablePages.next([]);
        });

        if (this.authService.getToken()) {
            this.buildSearchIndex();
        }
    }
    
    private async loadAllCrudDefs(): Promise<CrudDef[]> {
        try {
            const crudModules = await this.crudModulesLoader();
            const loaderPromises = crudModules.map((moduleDef: any) => moduleDef.loader());
            const loadedModules = await Promise.all(loaderPromises);

            const defs = loadedModules.map(module => {
                const defKey = Object.keys(module).find(key => key.endsWith('_DEF'));
                return defKey ? module[defKey] : null;
            }).filter(Boolean) as CrudDef[];

            defs.forEach(def => {
                if (def.i18n) {
                    this.i18nService.addI18n(def.i18n);
                }
            });

            return defs;
        } catch (e) {
            console.error('[SearchService] Error loading CRUD defs:', e);
            return [];
        }
    }

    private normalizeString(str: string): string {
        if (!str) return '';
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    public async buildSearchIndex(): Promise<void> {
        if (this.isBuildingIndex) return;
        this.isBuildingIndex = true;

        try {
            const crudDefs = await this.loadAllCrudDefs();
            const results: SearchResult[] = [];
            const addedLinks = new Set<string>();

            const formatGroup = (group?: string): string => {
                if (!group) return '';
                const translated = this.i18nService.translate(group);
                if (translated && translated !== group) return translated;

                const knownGroups: Record<string, string> = {
                    'matricula': 'Matrícula',
                    'oferta-servicios': 'Oferta de Servicios',
                    'perfil': 'Mi Perfil',
                    'store': 'Compras On-line',
                    'suscripciones': 'Suscripciones',
                    'inscripciones': 'Inscripciones'
                };

                const cleanGroup = group.toLowerCase().split('.')[0];
                if (knownGroups[cleanGroup]) return knownGroups[cleanGroup];

                return cleanGroup.split(/[-_]/)
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            };

            const resolveTitle = (def: CrudDef): string => {
                const navDef = def.navigation;
                if (navDef?.translateKey) {
                    const trans = this.i18nService.translate(navDef.translateKey);
                    if (trans && trans !== navDef.translateKey) return trans;
                }
                const dict = def.i18n?.words || def.i18n?.dictionary;
                if (dict && navDef?.translateKey && dict[navDef.translateKey]) {
                    return dict[navDef.translateKey];
                }
                if (dict && dict['page_title']) {
                    return dict['page_title'];
                }
                if (dict && dict['title']) {
                    return dict['title'];
                }
                return def.name;
            };

            crudDefs.forEach(def => {
                const navDef = def.navigation;
                const readPermission = def.security?.readAccess;

                if (readPermission && !this.authService.hasPermission(readPermission)) {
                    return;
                }

                const title = resolveTitle(def);
                const linkUrl = navDef?.url || `/${def.name.toLowerCase()}`;

                let parentBreadcrumb = '';
                if (navDef?.group) {
                    parentBreadcrumb = formatGroup(navDef.group);
                } else if (navDef?.activeItemId) {
                    parentBreadcrumb = formatGroup(navDef.activeItemId);
                } else if (def.name.startsWith('PERFIL')) {
                    parentBreadcrumb = 'Mi Perfil';
                } else if (def.name.startsWith('MATRICULA')) {
                    parentBreadcrumb = 'Matrícula';
                } else if (def.name.startsWith('OFERTA_SERVICIOS')) {
                    parentBreadcrumb = 'Oferta de Servicios';
                }

                const breadcrumbParts = parentBreadcrumb ? [parentBreadcrumb] : [];

                if (title && linkUrl && !addedLinks.has(linkUrl)) {
                    addedLinks.add(linkUrl);
                    results.push({
                        title: title,
                        breadcrumb: breadcrumbParts,
                        link: linkUrl,
                        keywords: this.normalizeString(`${title} ${breadcrumbParts.join(' ')}`)
                    });
                }

                if (def.clusterConfig) {
                    const clusterItems = def.clusterConfig.actionsItems || def.clusterConfig.navigationItems || [];
                    const clusterParentTitle = def.clusterConfig.titleKey ? this.i18nService.translate(def.clusterConfig.titleKey) : title;
                    const clusterGroup = (clusterParentTitle && clusterParentTitle !== def.clusterConfig.titleKey) ? clusterParentTitle : (parentBreadcrumb || title);

                    clusterItems.forEach((item: any) => {
                        if (item.actionSecurity && !this.authService.hasPermission(item.actionSecurity)) {
                            return;
                        }
                        const itemTitle = item.actionNameKey ? this.i18nService.translate(item.actionNameKey) : item.label;
                        if (!itemTitle || itemTitle === item.actionNameKey) return;

                        const itemLink = item.path ? (item.path.startsWith('/') ? item.path : `/${item.path}`) : linkUrl;

                        if (!addedLinks.has(itemLink)) {
                            addedLinks.add(itemLink);
                            results.push({
                                title: itemTitle,
                                breadcrumb: [clusterGroup],
                                link: itemLink,
                                keywords: this.normalizeString(`${itemTitle} ${clusterGroup}`)
                            });
                        }
                    });
                }
            });

            this.searchablePages.next(results);
        } finally {
            this.isBuildingIndex = false;
        }
    }

    search(term: string): Observable<SearchResult[]> {
        const normalizedTerm = this.normalizeString(term);
        if (!normalizedTerm) {
            return of([]);
        }

        return this.searchablePages$.pipe(
            take(1),
            map(pages => pages.filter(page => page.keywords.includes(normalizedTerm)))
        );
    }
}