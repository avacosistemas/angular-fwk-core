import { EnvironmentProviders, Provider, APP_INITIALIZER, inject } from '@angular/core';
import { CrudRegistryService } from '../services/crud-registry.service';
import { IconsService } from '../services/icons.service';

export function crudRegistryServiceFactory(): CrudRegistryService {
    return CrudRegistryService.instance || new CrudRegistryService();
}

export const provideFwkCore = (): Array<Provider | EnvironmentProviders> =>
{
    return [
        {
            provide: CrudRegistryService,
            useFactory: crudRegistryServiceFactory
        },
        {
            provide : APP_INITIALIZER,
            useFactory: (iconsService: IconsService) => () => iconsService.load(),
            deps: [IconsService],
            multi   : true,
        },
    ];
};