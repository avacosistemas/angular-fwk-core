import { Inject, Injectable } from '@angular/core';
import { FWK_CONFIG } from './config.constants';
import { merge } from 'lodash-es';
import { BehaviorSubject, Observable } from 'rxjs';

const THEME_STORAGE_KEY = 'Fwk-theme-scheme';

@Injectable({providedIn: 'root'})
export class FwkConfigService
{
    private _config: BehaviorSubject<any>;

    /**
     * Constructor
     */
    constructor(@Inject(FWK_CONFIG) config: any)
    {
        let initialConfig = config;

        try {
            const savedScheme = localStorage.getItem(THEME_STORAGE_KEY);
            if (savedScheme && ['dark', 'light', 'auto'].includes(savedScheme)) {
                initialConfig = merge({}, config, { scheme: savedScheme });
            }
        } catch (e) {
            console.error('Error al leer la preferencia de tema desde localStorage:', e);
        }

        // Private
        this._config = new BehaviorSubject(initialConfig);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for config
     */
    set config(value: any)
    {
        // Merge the new config over to the current config
        const config = merge({}, this._config.getValue(), value);

        if (value && value.scheme && ['dark', 'light', 'auto'].includes(value.scheme)) {
            try {
                localStorage.setItem(THEME_STORAGE_KEY, value.scheme);
            } catch (e) {
                console.error('Error al guardar la preferencia de tema en localStorage:', e);
            }
        }

        // Execute the observable
        this._config.next(config);
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    get config$(): Observable<any>
    {
        return this._config.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Resets the config to the default
     */
    reset(): void
    {
        // Set the config
        this._config.next(this.config);
    }
}
