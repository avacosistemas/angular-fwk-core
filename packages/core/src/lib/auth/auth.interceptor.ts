import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { NotificationService } from '../services/notification/notification.service';
import { AbstractAuthService } from './abstract-auth.service';
import { I18nService } from '../services/i18n-service/i18n.service';

export const authInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const authService = inject(AbstractAuthService);
    const notificationService = inject(NotificationService);
    const i18nService = inject(I18nService);
    const token = authService.getToken();

    let authReq = req;
    if (token && !req.headers.has('Authorization')) {
        authReq = addTokenHeader(req, token);
    }

    return next(authReq).pipe(
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401 && token) {
                return handle401Error(authReq, next, authService, i18nService);
            }

            if (error instanceof HttpErrorResponse && error.status === 401) {
                const errorMessage = i18nService.getDictionary('fwk')?.translate?.('interceptor_session_expired_relogin') ?? 'interceptor_session_expired_relogin';
                notificationService.notifyError(errorMessage);
                authService.signOut().subscribe();
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

const handle401Error = (req: HttpRequest<any>, next: HttpHandlerFn, authService: AbstractAuthService, i18nService: I18nService): Observable<HttpEvent<any>> => {

    return authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
            const token = typeof tokenResponse === 'string'
                ? tokenResponse
                : (tokenResponse?.data?.token || tokenResponse?.token || authService.getToken());
            if (!token) {
                authService.signOut().subscribe();
                const errorMessage = i18nService.getDictionary('fwk')?.translate?.('interceptor_session_expired_no_renew') ?? 'interceptor_session_expired_no_renew';
                return throwError(() => new Error(errorMessage));
            }
            return next(addTokenHeader(req, token));
        }),
        catchError((err) => {
            authService.signOut().subscribe();
            const errorMessage = i18nService.getDictionary('fwk')?.translate?.('interceptor_session_expired_no_renew') ?? 'interceptor_session_expired_no_renew';
            return throwError(() => new Error(errorMessage));
        })
    );
};