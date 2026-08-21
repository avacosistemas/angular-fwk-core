import { Injector } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Entity } from '../../model/entity';
import { HttpService } from '../http-service/http.service';
import { FormService } from '../dynamic-form/form.service';
import { CRUD } from './crud';

export abstract class CrudService<E extends Entity> extends HttpService implements CRUD<E> {

    formService: FormService;

    constructor(baseURL: string, protected override injector: Injector) {
        super(injector, baseURL);
        this.formService = injector.get(FormService);
    }

    findAll(
        filterEntity: any = null,
        fieldsDef: any = null,
        filterInMemory: boolean = true,
        page: { page: number, pageSize: number } | null = null
    ): Observable<E[]> {

        if (filterInMemory && filterEntity && fieldsDef) {
            return super.httpGet(this.baseUrl).pipe(
                map(entities => this.applyMemoryFilter(entities, filterEntity, fieldsDef))
            );
        }

        const params = this.buildHttpParams(filterEntity, page);
        const options = params ? { params } : {};

        if (!this.baseUrl) {
            console.error('[CrudService] ¡LA URL BASE ES NULA O VACÍA! La llamada no se realizará.');
            return of([]);
        }

        return super.httpGet(this.baseUrl, options);
    }

    private buildHttpParams(filterEntity: any, page: { page: number, pageSize: number } | null): HttpParams | null {
        let params = new HttpParams();
        let hasParams = false;

        if (page) {
            params = params.append('page', page.page.toString());
            params = params.append('pageSize', page.pageSize.toString());
            hasParams = true;
        }

        if (filterEntity) {
            for (const key in filterEntity) {
                if (Object.prototype.hasOwnProperty.call(filterEntity, key)) {
                    const value = filterEntity[key];
                    if (value !== null && value !== undefined && value !== '') {
                        if (typeof value === 'object' && !Array.isArray(value)) {
                        } else {
                            params = params.append(key, value);
                            hasParams = true;
                        }
                    }
                }
            }
        }

        return hasParams ? params : null;
    }

    getParametersToUrlAndPage(filterEntity: any, page: { page: number, pageSize: number }): HttpParams {
        const params = this.buildHttpParams(filterEntity, page);
        return params ?? new HttpParams();
    }

    getParametersToUrl(filterEntity: any): HttpParams {
        const params = this.buildHttpParams(filterEntity, null);
        return params ?? new HttpParams();
    }

    getById(id: number): Observable<E> {
        const url = `${this.baseUrl}/${id}`;
        return super.httpGet(url);
    }

    update(entity: E): Observable<E> {
        return this.httpPut(this.baseUrl, entity);
        // Put por ID en url
        // const id = (entity as any)?.id;
        // const url = (id !== undefined && id !== null && id !== '')
        //     ? `${this.baseUrl.replace(/\/$/, '')}/${id}`
        //     : this.baseUrl;
        // return this.httpPut(url, entity);
    }

    add(entity: E): Observable<E> {
        return this.httpPost(this.baseUrl, entity);
    }

    delete(entity: E | number): Observable<E> {
        const id = typeof entity === 'number' ? entity : entity.id;
        return this.httpDelete(this.baseUrl, id);
    }

    deleteAll(entities: E[]): Observable<E> {
        if (entities.length === 1) {
            return this.delete(entities[0]);
        } else {
            return this.multipleDelete(entities);
        }
    }

    deleteAllTernario(entities: E[], columnDefSingleId: string, columnDefMultiId: string): Observable<E> {
        return this.multipleDeleteTernario(entities, columnDefSingleId, columnDefMultiId);
    }

    search(term: string): Observable<E[]> {
        if (!term.trim()) {
            return of([]);
        }
        const params = new HttpParams().set('name', term);
        return this.http.get<E[]>(`${this.baseUrl}`, { params }).pipe(
            tap(data => this.log(`found entities matching "${term}"`))
        );
    }
}