import { Injectable, Inject, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, BehaviorSubject, throwError, catchError, tap, finalize, filter, take, map, shareReplay } from 'rxjs';
import { User } from './user.types';
import { UserService } from './user.service';
import { AbstractAuthService, SignInData } from './abstract-auth.service';
import { I18nService } from '../services/i18n-service/i18n.service';
import { NotificationService } from '../services/notification/notification.service';
import { FWK_CONFIG, FwkConfig } from '../model/fwk-config';
import { AuthUtils } from './auth.utils';
import { extractApiErrorMessage } from '../utils/error-utils';
import { formatImageSrc } from '../utils/image-utils';
import { ReauthModalComponent } from './components/reauth-modal/reauth-modal.component';

@Injectable({ providedIn: 'root' })
export class AuthService implements AbstractAuthService {
    private _authenticated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private _userPermissions: Set<string> = new Set<string>();
    private _checkRequest$: Observable<boolean> | null = null;

    private isRefreshing = false;
    private isReauthModalOpen = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    private _refreshTimeout: any;

    private readonly TOKEN_KEY: string;
    private readonly USER_DATA_KEY: string;

    constructor(
        private _httpClient: HttpClient,
        private _router: Router,
        private _userService: UserService,
        private _i18nService: I18nService,
        private _notificationService: NotificationService,
        private _injector: Injector,
        @Inject(FWK_CONFIG) private _fwkConfig: FwkConfig
    ) {
        this.TOKEN_KEY = (this._fwkConfig.appId || 'app') + '_accessToken';
        this.USER_DATA_KEY = (this._fwkConfig.appId || 'app') + '_currentUser';
    }

    get authenticated$(): Observable<boolean> { return this._authenticated.asObservable(); }
    get user(): User | null { return this._userService.userValue; }

    signIn(credentials: SignInData): Observable<any> {
        const signInUrl = this._fwkConfig.auth?.signIn;
        if (!signInUrl) {
            const errorMsg = 'No se ha configurado la URL de autenticación (auth.signIn).';
            console.error(errorMsg, this._fwkConfig);
            return throwError(() => ({ message: errorMsg, userMessage: errorMsg }));
        }

        return this._httpClient.post(signInUrl, credentials, { responseType: 'json' }).pipe(
            tap((responseFromApi: any) => {
                if (responseFromApi && responseFromApi.ok === false) {
                    const errorMsg = this.extractErrorMessage(responseFromApi);
                    const fallbackMsg = this._i18nService.getDictionary('fwk')?.translate?.('sign_in_error_message') ?? 'sign_in_error_message';
                    const finalMsg = errorMsg || fallbackMsg;
                    this._notificationService.notifyError(finalMsg);
                    throw {
                        error: responseFromApi,
                        userMessage: finalMsg,
                        message: finalMsg
                    };
                }
                this.handleAuthenticationSuccess(responseFromApi, credentials.username);
            }),
            catchError((error) => {
                const errPayload = error?.error?.data || error?.error;
                const tokenCandidate = errPayload?.token || errPayload?.data?.token;
                if (error.status === 409 && errPayload && tokenCandidate && errPayload.passwordExpired) {
                    this.handleAuthenticationSuccess(errPayload, credentials.username);
                    return of(errPayload);
                }
                return this.handleGenericAuthError(error, 'sign_in_error_message');
            })
        );
    }

    signOut(): Observable<any> {
        this.clearRefreshTimeout();
        this.clearLocalStorageAndState();
        return of(true);
    }

    check(): Observable<boolean> {
        if (this._checkRequest$) {
            return this._checkRequest$;
        }

        const token = this.getToken();

        if (!token) {
            this.signOut();
            return of(false);
        }

        if (AuthUtils.isTokenExpired(token, 60)) {
            this._checkRequest$ = this.refreshToken().pipe(
                map(() => {
                    this.ensureUserState();
                    return true;
                }),
                catchError(() => {
                    this.signOut();
                    return of(false);
                }),
                shareReplay(1),
                finalize(() => {
                    this._checkRequest$ = null;
                })
            );
            return this._checkRequest$;
        }

        this.ensureUserState();
        if (!this._authenticated.value) {
            this._authenticated.next(true);
        }
        this.scheduleTokenRenewal(token);
        return of(true);
    }

    private ensureUserState(): void {
        if (!this._userService.userValue) {
            const storedUser = this.getUserFromLocalStorage();
            if (storedUser) {
                this._userPermissions = new Set(storedUser.permisos ?? []);
                this._userService.user = storedUser;
            }
        }
    }

    refreshToken(): Observable<any> {
        if (this.isRefreshing) {
            return this.refreshTokenSubject.pipe(
                filter(token => token !== null),
                take(1)
            );
        } else {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            const refreshUrl = this._fwkConfig.auth!.refreshToken!;
            const token = this.getToken();
            let headers = new HttpHeaders();
            if (token) {
                headers = headers.set('Authorization', `Bearer ${token}`);
            }

            return this._httpClient.post<any>(refreshUrl, null, { headers }).pipe(
                tap((response: any) => {
                    if (response && response.ok === false) {
                        throw response;
                    }
                    const data = (response && response.data !== undefined && response.data !== null && typeof response.data === 'object' && !Array.isArray(response.data))
                        ? response.data
                        : response;
                    this.handleAuthenticationSuccess(response);
                    this.refreshTokenSubject.next(data.token || token);
                }),
                catchError((error) => {
                    this.triggerReauthModalOrLogout(error);
                    return throwError(() => error);
                }),
                finalize(() => {
                    this.isRefreshing = false;
                })
            );
        }
    }

    private triggerReauthModalOrLogout(error: any): void {
        if (this.isReauthModalOpen) return;
        this.isReauthModalOpen = true;

        try {
            const dialog = this._injector.get(MatDialog);
            const dialogRef = dialog.open(ReauthModalComponent, {
                width: '440px',
                maxWidth: '95vw',
                disableClose: false,
                panelClass: 'control-mat-dialog'
            });

            dialogRef.afterClosed().subscribe((result: any) => {
                this.isReauthModalOpen = false;
                if (result && result.success) {
                    window.location.reload();
                } else {
                    this.signOut().subscribe(() => {
                        this._router.navigate(['/sign-in']);
                    });
                }
            });
        } catch (e) {
            this.isReauthModalOpen = false;
            this.signOut().subscribe(() => {
                this._router.navigate(['/sign-in']);
            });
        }
    }

    hasPermission(permission?: string): boolean {
        if (!this._fwkConfig.security) {
            return true;
        }
        if (!permission) {
            return true;
        }
        return this._userPermissions.has(permission);
    }

    forgotPassword(email: string): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.forgotPassword!, { email }).pipe(
            catchError((error) => this.handleGenericAuthError(error, 'forgot_password_error_message'))
        );
    }

    resetPassword(data: any): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.resetPassword!, data).pipe(
            catchError((error) => this.handleGenericAuthError(error, 'reset_password_error_message'))
        );
    }

    signUp(data: any): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.signUp!, data).pipe(
            catchError((error) => this.handleGenericAuthError(error, 'generic_error_try_again'))
        );
    }

    unlockSession(data: { email: string; password: string }): Observable<any> {
        return this.signIn({ username: data.email, password: data.password });
    }

    changePassword(data: any): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.changePassword!, data).pipe(
            catchError((error) => this.handleGenericAuthError(error, 'change_password_error_message'))
        );
    }

    private handleGenericAuthError(error: any, fallbackKey: string): Observable<never> {
        if (error && error.userMessage) {
            return throwError(() => error);
        }
        const extractedMsg = this.extractErrorMessage(error);
        const fallbackMsg = this._i18nService.getDictionary('fwk')?.translate?.(fallbackKey)
            || this._i18nService.translate(fallbackKey);
        const finalMsg = extractedMsg || fallbackMsg;

        this._notificationService.notifyError(finalMsg);

        if (typeof error === 'object' && error !== null) {
            error.userMessage = finalMsg;
        } else {
            error = { error, userMessage: finalMsg, message: finalMsg };
        }
        return throwError(() => error);
    }

    private extractErrorMessage(error: any): string | null {
        return extractApiErrorMessage(error);
    }

    private handleAuthenticationSuccess(responseFromApi: any, submittedUsername?: string): void {
        const data = (responseFromApi && responseFromApi.data !== undefined && responseFromApi.data !== null && typeof responseFromApi.data === 'object' && !Array.isArray(responseFromApi.data))
            ? responseFromApi.data
            : responseFromApi;

        const accessToken = data.token || data.accessToken || data.jwt;
        const refreshTokenValue = data.refreshToken || data.refresh_token;

        if (!accessToken || typeof accessToken !== 'string') {
            console.error('La respuesta de la API no contiene un "token" válido.', responseFromApi);
            const errorMsg = this._i18nService.translate('auth_invalid_response');
            console.error(errorMsg, responseFromApi);
            throw new Error(errorMsg);
        }

        const emailNotSpecified = this._i18nService.getDictionary('fwk')?.translate?.('auth_email_not_specified') ?? 'auth_email_not_specified';

        const storedUser = this.getUserFromLocalStorage();

        let permisosProcesados: string[] = [];

        if (data.permissions && Array.isArray(data.permissions)) {
            permisosProcesados = data.permissions.map((p: any) => p.code || p);
        } else if (data.permisos) {
            if (Array.isArray(data.permisos)) {
                permisosProcesados = data.permisos.map((p: any) => typeof p === 'string' ? p : (p.code || p.name || p));
            } else if (typeof data.permisos === 'string') {
                permisosProcesados = data.permisos.split(';').map((p: string) => p.trim());
            }
        }

        if (permisosProcesados.length === 0 && storedUser?.permisos?.length) {
            permisosProcesados = storedUser.permisos;
        }

        const hasExplicitName = data.name != null && data.name !== '';
        const hasUsername = data.username != null && data.username !== '';

        const resolvedUsername = (hasUsername ? data.username : null)
            || (submittedUsername && !submittedUsername.includes('no especificado') ? submittedUsername : null)
            || (accessToken ? this.extractUsernameFromToken(accessToken) : null)
            || storedUser?.username
            || '';

        const resolvedUser = (submittedUsername && !submittedUsername.includes('no especificado'))
            ? submittedUsername
            : (data.user || data.username || storedUser?.user || storedUser?.username || '');

        const displayName = hasExplicitName
            ? data.name
            : resolvedUsername !== ''
                ? resolvedUsername
                : storedUser?.name ?? '';

        const rawPhoto = data.foto ?? data.imagen ?? data.avatar;
        const processedPhoto = formatImageSrc(rawPhoto)
            || (typeof data.avatar === 'string' ? formatImageSrc(data.avatar) : null)
            || (typeof storedUser?.avatar === 'string' ? storedUser.avatar : null)
            || undefined;

        const userForFwk: User = {
            ...(storedUser || {}),
            ...data,
            id: data.guid ?? data.id ?? storedUser?.id ?? '',
            guid: data.guid ?? storedUser?.guid ?? (data.id ? String(data.id) : undefined),
            name: displayName,
            email: data.email || storedUser?.email || emailNotSpecified,
            avatar: processedPhoto,
            foto: processedPhoto,
            imagen: processedPhoto,
            status: 'online',
            permisos: permisosProcesados,
            username: resolvedUsername,
            user: resolvedUser,
            passwordExpired: data.passwordExpired !== undefined ? (data.passwordExpired ?? undefined) : storedUser?.passwordExpired,
            fechaVencimiento: data.fechaVencimiento !== undefined ? (data.fechaVencimiento ?? undefined) : storedUser?.fechaVencimiento,
            matricula: data.matricula !== undefined ? data.matricula : storedUser?.matricula,
            idMatricula: data.idMatricula !== undefined ? data.idMatricula : storedUser?.idMatricula,
            tipoMatricula: data.tipoMatricula !== undefined ? data.tipoMatricula : storedUser?.tipoMatricula
        };

        this.setToken(accessToken);
        this.setUser(userForFwk);

        this._userPermissions = new Set(userForFwk.permisos);
        this._userService.user = userForFwk;
        this._authenticated.next(true);

        this.scheduleTokenRenewal(accessToken);
    }

    private clearLocalStorageAndState(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_DATA_KEY);
        this._authenticated.next(false);
        this._userService.user = { id: '', name: '', email: '' };
        this._userPermissions.clear();
    }

    private scheduleTokenRenewal(token: string): void {
        this.clearRefreshTimeout();

        const user = this.getUserFromLocalStorage();
        if (user?.passwordExpired) {
            return;
        }

        const expiryDate = this.getTokenExpirationDate(token);
        if (!expiryDate) {
            return;
        }

        const now = Date.now();
        const expiresAt = expiryDate.valueOf();
        const msUntilExpiry = expiresAt - now;

        if (msUntilExpiry <= 5000) {
            return;
        }

        let refreshDelay = msUntilExpiry - 60000;

        if (refreshDelay <= 0) {
            refreshDelay = msUntilExpiry / 2;
        }

        this._refreshTimeout = setTimeout(() => {
            this.refreshToken().subscribe();
        }, refreshDelay);
    }

    private clearRefreshTimeout(): void {
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = null;
        }
    }

    private getTokenExpirationDate(token: string): Date | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (!payload.exp) return null;

            const date = new Date(0);
            date.setUTCSeconds(payload.exp);
            return date;
        } catch (e) {
            return null;
        }
    }

    private extractUsernameFromToken(token: string): string | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

            if (payload.ApplicationUserModel) {
                const appUser = JSON.parse(payload.ApplicationUserModel);
                return appUser.username ?? null;
            }

            if (payload.sub) {
                return payload.sub;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    getToken(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
    private setToken(token: string): void { localStorage.setItem(this.TOKEN_KEY, token); }
    private setUser(user: User): void { localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(user)); }

    getUserFromLocalStorage(): User | null {
        const userData = localStorage.getItem(this.USER_DATA_KEY);
        if (!userData) return null;
        try {
            return JSON.parse(userData);
        } catch (e) {
            console.error('Error al leer datos de usuario de localStorage', e);
            return null;
        }
    }
}