import { Injectable, Injector } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpService } from '../http-service/http.service';
import { CrudDef } from '../../model/component-def/crud-def';

export const CRUDS: CrudDef[] = [];

@Injectable({
  providedIn: 'root'
})
export class CrudDefService extends HttpService {

    constructor(protected override injector: Injector) {
        super(injector, 'cruds');
    }

    getByName(crudName: string): Observable<CrudDef | undefined> {
        const crudDef = this.findCrudDefInMemory(crudName);
        return of(crudDef);
    }

    private findCrudDefInMemory(byName: string): CrudDef | undefined {
        return CRUDS.find(crud => crud.name === byName);
    }
}