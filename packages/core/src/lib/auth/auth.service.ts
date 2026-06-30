import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, BehaviorSubject, throwError, catchError, tap, finalize, filter, take, map, shareReplay } from 'rxjs';
import { User } from './user.types';
import { UserService } from './user.service';
import { AbstractAuthService, SignInData } from './abstract-auth.service';
import { I18nService } from '../services/i18n-service/i18n.service';
import { FWK_CONFIG, FwkConfig } from '../model/fwk-config';
import { AuthUtils } from './auth.utils';

@Injectable({ providedIn: 'root' })
export class AuthService implements AbstractAuthService {
    private _authenticated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    private _userPermissions: Set<string> = new Set<string>();
    private _checkRequest$: Observable<boolean> | null = null;

    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    private _refreshTimeout: any;

    private readonly TOKEN_KEY: string;
    private readonly USER_DATA_KEY: string;

    constructor(
        private _httpClient: HttpClient,
        private _router: Router,
        private _userService: UserService,
        private _i18nService: I18nService,
        @Inject(FWK_CONFIG) private _fwkConfig: FwkConfig
    ) {
        this.TOKEN_KEY = (this._fwkConfig.appId || 'app') + '_accessToken';
        this.USER_DATA_KEY = (this._fwkConfig.appId || 'app') + '_currentUser';
    }

    get authenticated$(): Observable<boolean> { return this._authenticated.asObservable(); }
  
    signIn(credentials: SignInData): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.signIn!, credentials, { responseType: 'json' }).pipe(
            tap((responseFromApi: any) => {
                this.handleAuthenticationSuccess(responseFromApi);
            }),
            catchError((error) => {
                if (error.status === 409 && error.error && error.error.token && error.error.passwordExpired) {
                    this.handleAuthenticationSuccess(error.error);
                    return of(error.error);
                }
                return throwError(() => error);
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

            // return this._httpClient.get<any>(`/mock-refresh.txt?cb=${Date.now()}`).pipe(
            return this._httpClient.post<any>(this._fwkConfig.auth!.refreshToken!, {}).pipe(
                tap((response: any) => {
                    this.handleAuthenticationSuccess(response);
                    this.refreshTokenSubject.next(response.token);
                }),
                catchError((error) => {
                    this.signOut();
                    return throwError(() => error);
                }),
                finalize(() => {
                    this.isRefreshing = false;
                })
            );
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
        return this._httpClient.post(this._fwkConfig.auth!.forgotPassword!, { email });
    }

    resetPassword(data: any): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.resetPassword!, data);
    }

    signUp(data: any): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.signUp!, data);
    }

    unlockSession(data: { email: string; password: string }): Observable<any> {
        return this.signIn({ username: data.email, password: data.password });
    }

    changePassword(data: any): Observable<any> {
        return this._httpClient.post(this._fwkConfig.auth!.changePassword!, data);
    }

    private handleAuthenticationSuccess(responseFromApi: any): void {
        const accessToken = responseFromApi.token;
        const refreshTokenValue = responseFromApi.refreshToken;

        if (!accessToken || typeof accessToken !== 'string') {
            console.error('La respuesta de la API no contiene un "token" válido.', responseFromApi);
            const errorMsg = this._i18nService.translate('auth_invalid_response');
            console.error(errorMsg, responseFromApi);
            throw new Error(errorMsg);
        }

        const emailNotSpecified = this._i18nService.getDictionary('fwk')?.translate?.('auth_email_not_specified') ?? 'auth_email_not_specified';

        const storedUser = this.getUserFromLocalStorage();

        let permisosProcesados: string[] = [];

        if (responseFromApi.permissions && Array.isArray(responseFromApi.permissions)) {
            permisosProcesados = responseFromApi.permissions.map((p: any) => p.code || p);
        } else if (responseFromApi.permisos) {
            if (Array.isArray(responseFromApi.permisos)) {
                permisosProcesados = responseFromApi.permisos;
            } else if (typeof responseFromApi.permisos === 'string') {
                permisosProcesados = responseFromApi.permisos.split(';');
            }
        }

        if (permisosProcesados.length === 0 && storedUser?.permisos?.length) {
            permisosProcesados = storedUser.permisos;
        }

        const hasExplicitName = responseFromApi.name != null && responseFromApi.name !== '';
        const hasUsername = responseFromApi.username != null && responseFromApi.username !== '';

        const displayName = hasExplicitName
            ? responseFromApi.name
            : hasUsername
                ? responseFromApi.username
                : storedUser?.name ?? '';

        const loginUsername = hasExplicitName
            ? responseFromApi.username
            : hasUsername
                ? (this.extractUsernameFromToken(accessToken) ?? responseFromApi.username)
                : storedUser?.username ?? '';

        const userForFwk: User = {
            id: responseFromApi.guid ?? storedUser?.id ?? '',
            name: displayName,
            email: responseFromApi.email || storedUser?.email || emailNotSpecified,
            avatar: storedUser?.avatar ?? undefined,
            status: 'online',
            permisos: permisosProcesados,
            refreshToken: refreshTokenValue || storedUser?.refreshToken || accessToken,
            username: loginUsername,
            passwordExpired: responseFromApi.passwordExpired !== undefined ? (responseFromApi.passwordExpired ?? undefined) : storedUser?.passwordExpired,
            fechaVencimiento: responseFromApi.fechaVencimiento !== undefined ? (responseFromApi.fechaVencimiento ?? undefined) : storedUser?.fechaVencimiento
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