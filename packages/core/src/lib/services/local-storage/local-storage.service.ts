import { Injectable, Inject } from '@angular/core';
import { I18n } from '../../model/i18n';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';

export interface UserCredentials {
    username: string;
    password?: string;
}

export const LOGIN_FORM_USERDATA = 'LOGIN_FORM_USERDATA';
export const I18N_DATA = 'I18N_DATA';
export const TO_CLONE_DATA = 'TO_CLONE_DATA';
export const USER_DATA_FOR_FORCE_CHANGE_PASSWORD = 'USER_DATA_FOR_FORCE_CHANGE_PASSWORD';

@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {
    private tokenKey: string;
    private USER_DATA: string;

    constructor(@Inject(FWK_CONFIG) private _fwkConfig: FwkConfig) {
        this.tokenKey = this._fwkConfig.appId + '_jwt_token';
        this.USER_DATA = this._fwkConfig.appId + '_currentUser';
    }

    setTokenKey(tokenKey: string): void {
        this.tokenKey = tokenKey;
    }

    cleanTokenData(): void {
        localStorage.removeItem(this.tokenKey);
    }

    saveTokenData(token: string): void {
        localStorage.setItem(this.tokenKey, token);
    }

    getTokenData(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    private _appPrefix(): string {
        return this._fwkConfig.appId + '_';
    }

    cleanLoginFormUserData(): void {
        localStorage.removeItem(this._appPrefix() + LOGIN_FORM_USERDATA);
    }

    saveLoginFormUserData(user: UserCredentials): void {
        localStorage.setItem(this._appPrefix() + LOGIN_FORM_USERDATA, JSON.stringify(user));
    }

    getLoginFormUserData(): UserCredentials | null {
        const storedData = localStorage.getItem(this._appPrefix() + LOGIN_FORM_USERDATA);
        return storedData ? JSON.parse(storedData) : null;
    }

    cleanUserDataForForceChangePassword(): void {
        localStorage.removeItem(this._appPrefix() + USER_DATA_FOR_FORCE_CHANGE_PASSWORD);
    }

    saveUserDataForForceChangePassword(user: UserCredentials): void {
        localStorage.setItem(this._appPrefix() + USER_DATA_FOR_FORCE_CHANGE_PASSWORD, JSON.stringify(user));
    }

    getUserDataForForceChangePassword(): UserCredentials | null {
        const storedData = localStorage.getItem(this._appPrefix() + USER_DATA_FOR_FORCE_CHANGE_PASSWORD);
        return storedData ? JSON.parse(storedData) : null;
    }

    cleanI18nData(): void {
        localStorage.removeItem(this._appPrefix() + I18N_DATA);
    }

    saveI18nData(i18n: I18n[]): void {
        localStorage.setItem(this._appPrefix() + I18N_DATA, JSON.stringify(i18n));
    }

    getI18nData(): I18n[] | null {
        const storedData = localStorage.getItem(this._appPrefix() + I18N_DATA);
        return storedData ? JSON.parse(storedData) : null;
    }

    cleanUserSession(): void {
        this.cleanUserDataForForceChangePassword();
        this.cleanTokenData();
        this.cleanI18nData();
    }

    clone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    save(key: string, obj: any): void {
        localStorage.setItem(this._appPrefix() + key, JSON.stringify(obj));
    }

    get<T>(key: string): T | null {
        const storedData = localStorage.getItem(this._appPrefix() + key);
        return storedData ? JSON.parse(storedData) : null;
    }

    remove(key: string): void {
        localStorage.removeItem(this._appPrefix() + key);
    }

    getUserLocalStorage(): any {
        return this.get(this.USER_DATA);
    }
}