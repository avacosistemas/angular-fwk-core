import { Injectable, Inject } from '@angular/core';
import { Observable, of, ReplaySubject } from 'rxjs';
import { switchMap, take, filter, map } from 'rxjs/operators';
import { CrudDef } from '../../model/component-def/crud-def';
import { FWK_CRUD_MODULES_LOADER } from '../../navigation/navigation.tokens';
import { AbstractAuthService } from '../../auth/abstract-auth.service';

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

    constructor(
        @Inject(FWK_CRUD_MODULES_LOADER) private crudModulesLoader: () => Promise<any>,
        private authService: AbstractAuthService
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
    }
    
    private async loadAllCrudDefs(): Promise<CrudDef[]> {
        const crudModules = await this.crudModulesLoader();
        const loaderPromises = crudModules.map(moduleDef => moduleDef.loader());
        const loadedModules = await Promise.all(loaderPromises);

        return loadedModules.map(module => {
            const defKey = Object.keys(module).find(key => key.endsWith('_DEF'));
            return defKey ? module[defKey] : null;
        }).filter(Boolean) as CrudDef[];
    }

    private async buildSearchIndex(): Promise<void> {
        const crudDefs = await this.loadAllCrudDefs();
        const results: SearchResult[] = [];

        crudDefs.forEach(def => {
            const navDef = def.navigation;
            const readPermission = def.security?.readAccess;

            if (!navDef || navDef.showInMenu !== true || !this.authService.hasPermission(readPermission)) {
                return;
            }
            
            let translatedTitle = navDef.translateKey;
            const dictionary = def.i18n?.words || def.i18n?.dictionary;
            if (dictionary && navDef.translateKey && dictionary[navDef.translateKey]) {
                translatedTitle = dictionary[navDef.translateKey];
            }
            
            const breadcrumb = navDef.group ? navDef.group.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')) : [];

            results.push({
                title: translatedTitle,
                breadcrumb,
                link: navDef.url,
                keywords: `${translatedTitle} ${breadcrumb.join(' ')}`.toLowerCase()
            });
        });
        
        this.searchablePages.next(results);
    }

    search(term: string): Observable<SearchResult[]> {
        const lowerCaseTerm = term.toLowerCase().trim();
        if (!lowerCaseTerm) {
            return of([]);
        }

        return this.searchablePages$.pipe(
            take(1),
            map(pages => pages.filter(page => page.keywords.includes(lowerCaseTerm)))
        );
    }
}