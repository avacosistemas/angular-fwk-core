import { Pipe, PipeTransform } from '@angular/core';
import { I18nService } from '../services/i18n-service/i18n.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private i18nService: I18nService) {}

  transform(key: string, args?: any, dictionaryName: string = 'app'): string {
    if (!key) return '';
    let params: any = {};
    let targetDictionary = dictionaryName;

    if (typeof args === 'object' && args !== null) {
      params = args;
    } else if (typeof args === 'string') {
      targetDictionary = args;
    }

    let translation = this.i18nService.translate(key, targetDictionary);

    if (params && translation) {
      Object.keys(params).forEach(paramKey => {
        let value = params[paramKey];
        
        const isoDateRegExp = /^\d{4}-\d{2}-\d{2}$/;
        if (typeof value === 'string' && isoDateRegExp.test(value)) {
            const parts = value.split('-');
            value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        const regex = new RegExp(`{{${paramKey}}}|{${paramKey}}`, 'g');
        translation = translation.replace(regex, value);
      });
    }

    return translation;
  }
}
