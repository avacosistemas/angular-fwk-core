import { EnvironmentProviders, Provider } from '@angular/core';
import { AuthService } from './auth.service';
import { AbstractAuthService } from './abstract-auth.service';

export const provideAppAuth = (): Array<Provider | EnvironmentProviders> =>
{
    return [
        {
            provide: AbstractAuthService,
            useExisting: AuthService
        }
    ];
};

export const provideFwkAuth = (): Array<Provider | EnvironmentProviders> =>
{
    return [];
};