import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BaseService } from '../base-service/base.service';
import { I18n } from '../../model/i18n';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';

@Injectable({
    providedIn: 'root'
})
export class I18nService extends BaseService {
    private dictionaries: Map<string, I18n> = new Map();

    constructor(@Inject(FWK_CONFIG) private fwkConfig: FwkConfig) {
        super();
    }

    translate(key: string, dictionaryName: string = 'app'): string {
        if (!key) return '';
        const dict = this.getDictionary(dictionaryName);
        let translation = dict?.translate?.(key);

        if (!translation || translation === key) {
            translation = this.getDictionary('fwk')?.translate?.(key);
        }

        if (!translation || translation === key) {
            for (const dict of this.dictionaries.values()) {
                const t = dict.translate?.(key);
                if (t && t !== key) {
                    translation = t;
                    break;
                }
            }
        }

        const result = translation || key;

        if (result.includes('{{appName}}')) {
            return result.replace(/{{appName}}/g, this.fwkConfig.brand.name);
        }

        return result;
    }

    getDictionary(name: string): I18n | undefined {
        if (!name || typeof name !== 'string') return undefined;
        return this.dictionaries.get(name.toLowerCase());
    }

    getByName(byName: string): Observable<I18n> {
        const dictionary = this.getDictionary(byName) || new I18n();
        return of(dictionary);
    }

    addI18n(i18n: I18n): void {
        if (!i18n || !i18n.name || typeof i18n.name !== 'string') return;
        const key = i18n.name.toLowerCase();
        let i18nInstance = this.dictionaries.get(key);
        if (!i18nInstance) {
            i18nInstance = new I18n();
            this.dictionaries.set(key, i18nInstance);
        }
        if (i18nInstance.clone) {
            i18nInstance.clone(i18n);
        } else {
            Object.assign(i18nInstance, JSON.parse(JSON.stringify(i18n)));
        }
    }
}
