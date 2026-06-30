import { ENVIRONMENT_INITIALIZER, EnvironmentProviders, importProvidersFrom, inject, Provider } from '@angular/core';
import { MATERIAL_SANITY_CHECKS } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { FwkConfig } from './infrastructure/services/config';
import { FWK_CONFIG } from './infrastructure/services/config/config.constants';
import { FwkLoadingService } from './infrastructure/services/loading';
import { FwkMediaWatcherService } from './infrastructure/services/media-watcher';
import { FwkPlatformService } from './infrastructure/services/platform';
import { FwkSplashScreenService } from './infrastructure/services/splash-screen';
import { FwkUtilsService } from './infrastructure/services/utils';

export type FwkLayoutConfig = {
    fwk?: FwkConfig
}

export const provideFwkLayout = (config: FwkLayoutConfig): Array<Provider | EnvironmentProviders> =>
{
    const providers: Array<Provider | EnvironmentProviders> = [
        {
            provide : MATERIAL_SANITY_CHECKS,
            useValue: {
                doctype: true,
                theme  : false,
                version: true,
            },
        },
        {
            provide : MAT_FORM_FIELD_DEFAULT_OPTIONS,
            useValue: {
                appearance: 'fill',
            },
        },
        {
            provide : FWK_CONFIG,
            useValue: config?.fwk ?? {},
        },

        importProvidersFrom(MatDialogModule),
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(FwkLoadingService),
            multi   : true,
        },
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(FwkMediaWatcherService),
            multi   : true,
        },
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(FwkPlatformService),
            multi   : true,
        },
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(FwkUtilsService),
            multi   : true,
        },
        {
            provide : ENVIRONMENT_INITIALIZER,
            useValue: () => inject(FwkSplashScreenService),
            multi   : true,
        },
    ];

    return providers;
};
