import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { BaseService } from '../base-service/base.service';
import { DummyService } from '../dummy-service/dummy.service';
import { FilterService, FILTER_TYPE } from '../filter-service/filter.service';
import { NotificationService } from '../notification/notification.service';
import { I18nService } from '../i18n-service/i18n.service';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';
import { extractApiErrorMessage } from '../../utils/error-utils';

@Injectable({
  providedIn: 'root'
})
export class HttpService extends BaseService {

  protected baseUrl: string;
  protected http: HttpClient;
  dummyService: any;
  filterService: FilterService;
  notificationService: NotificationService;
  i18nService: I18nService;
  private _fwkConfig: FwkConfig;

  constructor(protected injector: Injector, baseURL: string) {
    super();
    this._fwkConfig = injector.get(FWK_CONFIG);
    this.http = injector.get(HttpClient);
    this.filterService = injector.get(FilterService);
    this.notificationService = injector.get(NotificationService);
    this.i18nService = injector.get(I18nService);
    this.baseUrl = baseURL;
    if (this._fwkConfig.dummyServices) {
      this.dummyService = injector.get(DummyService);
    }
  }

  downloadBoleta(idContact: number): void {
    this.http.get(`${this._fwkConfig.apiBaseUrl}matriculado/GenerarBoletaContact?id=${idContact}`, {
      observe: 'response',
      responseType: 'blob'
    }).pipe(
      tap((resp: HttpResponse<Blob>) => {
        const name = 'Boleta';
        this.downloadFile(resp, name);
      }),
      catchError(error => this.handleError(error))
    ).subscribe();
  }

  downloadCsv(url: string, params: any): Observable<any> {
    const options = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      params: new HttpParams({ fromObject: params })
    };
    return this.http.get<any>(url, options).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  downloadFile(resp: HttpResponse<Blob>, name: string): void {
    const contentType = resp.headers.get('Content-type');
    if (!resp.body || !contentType) {
      const errorMessage = this.i18nService.getDictionary('fwk')?.translate?.('http_error_no_download') ?? 'http_error_no_download';
      this.notificationService.notifyError(errorMessage);
      return;
    }
    const file = new Blob([resp.body], { type: contentType });

    const fileURL = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = fileURL;
    a.target = '_blank';
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(fileURL);
  }

  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
  }

  httpGet(url: string, options?: any): Observable<any> {
    if (this.dummyService) {
      return this.dummyService.httpGet(url);
    }
    const cacheBuster = `nocache=${new Date().getTime()}`;
    const finalUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;

    return this.http.get<any>(finalUrl, options).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  httpPut(url: string, data: any): Observable<any> {
    if (this.dummyService) {
      return this.dummyService.httpPut(url, data);
    }
    return this.http.put(url, data, this.getHttpOptions()).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  httpPost(url: string, data: any): Observable<any> {
    if (this.dummyService) {
      return this.dummyService.httpPost(url, data);
    }

    const options = data instanceof FormData ? {} : this.getHttpOptions();

    return this.http.post(url, data, options).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  httpDelete(url: string, id: number | string): Observable<any> {
    const finalUrl = `${url.replace(/\/$/, '')}/${id}`;
    if (this.dummyService) {
      return this.dummyService.httpDelete(finalUrl, [id]);
    }
    return this.http.delete(finalUrl, this.getHttpOptions()).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  httpDeleteTernaria(url: string): Observable<any> {
    return this.http.delete(url, this.getHttpOptions()).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  multipleDelete(entities: { id: number | string }[]): Observable<any> {
    if (this.dummyService) {
      const ids = entities.map(e => e.id);
      return this.dummyService.httpDelete(this.baseUrl, ids);
    }
    const ids = entities.map(e => e.id).join(',');
    const url = `${this.baseUrl.replace(/\/$/, '')}/${ids}`;
    return this.http.delete(url, this.getHttpOptions()).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  multipleDeleteTernario(entities: any[], columnDefSingleId: string, columnDefMultiId: string): Observable<any> {
    if (this.dummyService) {
      return of({ success: true });
    }

    if (entities.length === 0) {
      return of({});
    }

    const singleId = entities[0][columnDefSingleId];
    const multiIds = entities.map(e => e[columnDefMultiId]).join(',');

    const url = `${this.baseUrl}/${columnDefSingleId}/${singleId}/${columnDefMultiId}/${multiIds}`;

    return this.http.delete(url, this.getHttpOptions()).pipe(
      map(response => this.handleResponse(response)),
      catchError(error => this.handleError(error))
    );
  }

  private handleResponse(response: any): any {
    if (response && response.ok === false) {
      const errorMessage = extractApiErrorMessage(response) ||
        this.i18nService.getDictionary('fwk')?.translate?.('http_error_generic') ||
        this.i18nService.translate('http_operation_failed_no_cause');
      throw {
        error: {
          status: response.error?.type || response.status || 'VALIDATIONS_ERRORS',
          message: errorMessage,
          ...((response.error && typeof response.error === 'object') ? response.error : {})
        }
      };
    }

    if (response) {
      this.notificationService.checkAndNotifyExtraMessages(response);
    }

    if (response && response.page) {
      this.filterService.totalReg = response.page.totalReg;
    }

    return response && response.data !== undefined ? response.data : response;
  }

  private handleError(error: any): Observable<never> {
    console.error('Error técnico HTTP:', {
      message: error?.message,
      status: error?.status,
      url: error?.url,
      errorBody: error?.error,
    });

    const translate = (key: string) => this.i18nService.getDictionary('fwk')?.translate?.(key) || key;

    const extractedMessage = extractApiErrorMessage(error);
    let userFriendlyMessage = extractedMessage || translate('http_error_generic');

    if (!extractedMessage && error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 400:
          userFriendlyMessage = translate('http_error_400');
          break;
        case 401:
          return throwError(() => error);
        case 403:
          userFriendlyMessage = translate('http_error_403');
          break;
        case 404:
          userFriendlyMessage = translate('http_error_404');
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          userFriendlyMessage = translate('http_error_5xx');
          break;
        case 0:
          userFriendlyMessage = translate('http_error_0');
          break;
        default:
          userFriendlyMessage = translate('http_error_generic');
          break;
      }
    } else if (error instanceof HttpErrorResponse && error.status === 401) {
      return throwError(() => error);
    }

    this.notificationService.notifyError(userFriendlyMessage);

    return throwError(() => error);
  }

  applyMemoryFilter(entities: any, filterEntity: any, fieldsDef: any): any {
    if (filterEntity && filterEntity !== null) {
      Object.getOwnPropertyNames(filterEntity).forEach((val) => {
        entities = entities.filter((ent: { [x: string]: any; }) => {
          const field = fieldsDef.find((f: { key: string; }) => f.key === val);
          if (!field) return true;

          let entityValue = ent[val];
          if (entityValue === undefined && (field.options && field.options.matchTo)) {
            entityValue = ent[field.options.matchTo];
          }
          const filterValue = filterEntity[val];
          const filterType = field.filterType ? field.filterType.toUpperCase() : FILTER_TYPE.LIKE;
          return this.filterService.filter(entityValue, filterValue, filterType, field);
        });
      });
    }
    return entities;
  }
}