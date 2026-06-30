import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { ApiAutocompleteConfiguration } from './autocomplete.interface';
import { GenericHttpService } from '../../services/generic-http-service/generic-http.service';
import { map, catchError } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AutocompleteService {

  constructor(protected httpService: GenericHttpService) { }

  public autocompleteSearch(formGroup: FormGroup, configuration: ApiAutocompleteConfiguration, term: string): Observable<any[]> {
    const apiOptions = configuration.apiOptions;

    if (!apiOptions?.url) {
      let data = apiOptions?.fromData || (configuration as any).options?.fromData || [];
      if (term) {
        const labelKey = configuration.options?.elementLabel || (configuration as any).apiOptions?.elementLabel;
        data = data.filter((item: any) => {
          const val = labelKey ? item[labelKey] : item;
          return String(val).toLowerCase().includes(term.toLowerCase());
        });
      }
      return of(data);
    }

    let params = new HttpParams();
    const queryString = apiOptions.queryString || {};

    const searchTermKey = Object.keys(queryString).find(
      key => queryString[key] === configuration.key
    );

    if (searchTermKey) {
      params = params.set(searchTermKey, term);
    } else {
      console.warn(`[FWK] Autocomplete: No se encontró la clave del término de búsqueda en queryString para el campo '${configuration.key}'. La búsqueda podría fallar si se esperaba un término.`);
    }

    for (const key in queryString) {
      if (queryString.hasOwnProperty(key) && key !== searchTermKey) {
        const controlName = queryString[key];
        const control = formGroup.get(controlName);

        if (!control || control.value === null || control.value === undefined || control.value === '') {
          console.log(`[Autocomplete] Abortando búsqueda para ${configuration.key}: falta dependencia ${controlName}`);
          return of([]);
        }

        params = params.set(key, control.value);
      }
    }

    return this.httpService.basicGet(apiOptions.url, params, {}, {}).pipe(
      map(response => response || []),
      catchError(error => {
        console.error('Error en la búsqueda de autocompletado:', error);
        return of([]);
      })
    );
  }

  private getFilter(queryString: any, formGroup: FormGroup): { [key: string]: any } {
    const filter: { [key: string]: any } = {};
    if (queryString) {
      for (const prop in queryString) {
        if (queryString.hasOwnProperty(prop)) {
          const controlName = queryString[prop];
          if (formGroup.controls[controlName]) {
            filter[prop] = formGroup.controls[controlName].value;
          }
        }
      }
    }
    return filter;
  }
}