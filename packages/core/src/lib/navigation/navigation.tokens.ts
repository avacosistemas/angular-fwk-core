import { InjectionToken } from '@angular/core';
import { CrudDef } from '../model/component-def/crud-def';
import { CrudModuleDefinition } from '../model/crud-module-definition';
import { NavigationGroup } from './navigation.types';

export const FWK_CRUD_MODULES_LOADER = new InjectionToken<() => Promise<CrudModuleDefinition[]>>('FWK_CRUD_MODULES_LOADER');
export const FWK_NAVIGATION_GROUPS = new InjectionToken<NavigationGroup[]>('FWK_NAVIGATION_GROUPS');
export const FWK_LOAD_CRUD_BY_PATH = new InjectionToken<(path: string) => Promise<CrudDef | null>>('FWK_LOAD_CRUD_BY_PATH');