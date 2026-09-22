import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NotificationService } from '../services/notification/notification.service';
import { AbstractAuthService } from './abstract-auth.service';
import { I18nService } from '../services/i18n-service/i18n.service';
import { FWK_CONFIG } from '../model/fwk-config';

export const authInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const authService = inject(AbstractAuthService);
    const notificationService = inject(NotificationService);
    const i18nService = inject(I18nService);
    const router = inject(Router);
    const dialog = inject(MatDialog, { optional: true });
    const fwkConfig = inject(FWK_CONFIG, { optional: true });
    const token = authService.getToken();

    let authReq = req;
    if (token && !req.headers.has('Authorization')) {
        authReq = addTokenHeader(req, token);
    }

    const redirectToLogin = () => {
        try {
            dialog?.closeAll();
        } catch (e) {}
        authService.signOut().subscribe(() => {
            const currentUrl = router.url;
            const hasValidPath = currentUrl && currentUrl !== '/' && !currentUrl.startsWith('/sign-in') && !currentUrl.startsWith('/sign-out');
            const targetUrl = hasValidPath
                ? `/sign-in?redirectURL=${encodeURIComponent(currentUrl)}`
                : (fwkConfig?.routing?.redirectOnLogout || '/sign-in');
            router.navigateByUrl(targetUrl);
        });
    };

    return next(authReq).pipe(
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401 && token) {
                return handle401Error(authReq, next, authService, i18nService, redirectToLogin);
            }

            if (error instanceof HttpErrorResponse && error.status === 401) {
                const errorMessage = i18nService.getDictionary('fwk')?.translate?.('interceptor_session_expired_relogin') ?? 'interceptor_session_expired_relogin';
                notificationService.notifyError(errorMessage);
                redirectToLogin();
            }

            return throwError(() => error);
        })
    );
};

const addTokenHeader = (request: HttpRequest<any>, token: string) => {
    return request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`),
    });
};

const handle401Error = (
    req: HttpRequest<any>,
    next: HttpHandlerFn,
    authService: AbstractAuthService,
    i18nService: I18nService,
    redirectToLogin: () => void
): Observable<HttpEvent<any>> => {

    return authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
            const token = typeof tokenResponse === 'string'
                ? tokenResponse
                : (tokenResponse?.data?.token || tokenResponse?.token || authService.getToken());
            if (!token) {
                redirectToLogin();
                const errorMessage = i18nService.getDictionary('fwk')?.translate?.('interceptor_session_expired_no_renew') ?? 'interceptor_session_expired_no_renew';
                return throwError(() => new Error(errorMessage));
            }
            return next(addTokenHeader(req, token));
        }),
        catchError((err) => {
            redirectToLogin();
            const errorMessage = i18nService.getDictionary('fwk')?.translate?.('interceptor_session_expired_no_renew') ?? 'interceptor_session_expired_no_renew';
            return throwError(() => new Error(errorMessage));
        })
    );
};