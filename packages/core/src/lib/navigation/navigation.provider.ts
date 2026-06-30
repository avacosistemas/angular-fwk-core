import { EnvironmentProviders, Provider } from '@angular/core';
import { FWK_CRUD_MODULES_LOADER, FWK_NAVIGATION_GROUPS, FWK_LOAD_CRUD_BY_PATH } from './navigation.tokens';
import { CrudModuleDefinition } from '../model/crud-module-definition';
import { CrudDef } from '../model/component-def/crud-def';
import { NavigationGroup } from './navigation.types';

export const provideAppNavigation = (
    crudModules?: CrudModuleDefinition[],
    navigationGroups?: NavigationGroup[],
    loadCrudByPath?: (path: string) => Promise<CrudDef | null>
): Array<Provider | EnvironmentProviders> =>
{
    return [
        {
            provide: FWK_CRUD_MODULES_LOADER,
            useValue: () => crudModules ? Promise.resolve(crudModules) : Promise.resolve([])
        },
        {
            provide: FWK_NAVIGATION_GROUPS,
            useValue: navigationGroups || []
        },
        ...(loadCrudByPath ? [{ provide: FWK_LOAD_CRUD_BY_PATH, useValue: loadCrudByPath }] : [])
    ];
};