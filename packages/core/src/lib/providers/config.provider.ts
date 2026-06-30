import { Provider } from '@angular/core';
import { FwkConfig, FWK_CONFIG } from '../model/fwk-config';

export const provideFwkBranding = (config: FwkConfig): Provider => {
    return {
        provide: FWK_CONFIG,
        useValue: config
    };
};