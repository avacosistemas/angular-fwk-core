import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AbstractAuthService } from '../abstract-auth.service';

export const NoAuthGuard: CanActivateFn | CanActivateChildFn = (route, state) =>
{
    const router: Router = inject(Router);

    return inject(AbstractAuthService).check().pipe(
        switchMap((authenticated) =>
        {
            if ( authenticated )
            {
                return of(router.parseUrl('signed-in-redirect'));
            }
            return of(true);
        }),
    );
};