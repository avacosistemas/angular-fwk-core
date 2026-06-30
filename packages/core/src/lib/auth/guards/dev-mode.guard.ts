import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';

export const DevModeGuard: CanActivateFn = () => {
    const router = inject(Router);
    const fwkConfig = inject<FwkConfig>(FWK_CONFIG);

    if (fwkConfig.production) {
        return router.parseUrl('/404');
    }

    return true;
};