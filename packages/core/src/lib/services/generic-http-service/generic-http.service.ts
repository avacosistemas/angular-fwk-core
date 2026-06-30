import { Injectable, Injector } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { HttpService } from '../http-service/http.service';
import { WsDef, HTTP_METHODS } from '../../model/ws-def';

@Injectable({
    providedIn: 'root'
})
export class GenericHttpService extends HttpService {

    constructor(protected override injector: Injector) {
        super(injector, '');
    }

    basicPost(url: string, data: any): Observable<any> {
        return this.httpPost(url, data);
    }

    basicDelete(url: string, data: { id: number | string }): Observable<any> {
        return this.httpDelete(url, data.id);
    }

    basicDeleteTernaria(url: string, data: any, querystringKeys: string[]): Observable<any> {
        let finalUrl = url;
        if (querystringKeys && data) {
            const pathSegments = querystringKeys
                .map(key => data[key])
                .filter(Boolean)
                .join('/');

            if (pathSegments) {
                finalUrl = finalUrl.replace(/\/$/, '') + '/' + pathSegments;
            }
        }
        return this.httpDeleteTernaria(finalUrl);
    }

    basicPut(url: string, data: any): Observable<any> {
        return this.httpPut(url, data);
    }

    override httpGet(url: string, queryParams: { [param: string]: string | number | boolean } | HttpParams | null = null): Observable<any> {
        const options: { params?: HttpParams } = {};

        if (queryParams) {
            if (queryParams instanceof HttpParams) {
                options.params = queryParams;
            } else {
                options.params = new HttpParams({ fromObject: queryParams as { [param: string]: string | number | boolean } });
            }
        }
        return super.httpGet(url, options);
    }

    basicGet(url: string, data: any, filter: any, querystring: { [key: string]: string }): Observable<any> {
        if (data instanceof HttpParams) {
            return this.httpGet(url, data);
        }

        let queryParams: { [param: string]: string } = {};

        if (querystring && data) {
            Object.keys(querystring).forEach(key => {
                const dataKey = querystring[key];
                if (data[dataKey]) {
                    queryParams[key] = data[dataKey];
                }
            });
        }

        return this.httpGet(url, queryParams);
    }

    callWs(ws: WsDef, data: any = null): Observable<any> {
        switch (ws.method?.toUpperCase()) {
            case HTTP_METHODS.post:
                return this.basicPost(ws.url, data);
            case HTTP_METHODS.delete:
                return this.basicDelete(ws.url, data);
            case HTTP_METHODS.delete_ternaria: {
                let keys: string[] = [];
                if (Array.isArray(ws.querystring)) {
                    keys = ws.querystring;
                } else if (typeof ws.querystring === 'object' && ws.querystring !== null) {
                    keys = Object.keys(ws.querystring);
                }
                return this.basicDeleteTernaria(ws.url, data, keys);
            }
            case HTTP_METHODS.put:
                return this.basicPut(ws.url, data);
            case HTTP_METHODS.get:
                return this.basicGet(ws.url, data, ws.filter, ws.querystring ?? {});
            default:
                console.warn(`Método HTTP no reconocido: ${ws.method}`);
                return of();
        }
    }
}