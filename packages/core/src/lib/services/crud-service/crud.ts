import { Observable } from 'rxjs';
import { Entity } from '../../model/entity';

export interface CRUD<E extends Entity> {
    findAll(filterEntity?: any, fieldsDef?: any, filterInMemory?: boolean, page?: { page: number, pageSize: number }): Observable<E[]>;
    getById(id: number): Observable<E>;
    update(entity: E): Observable<any>;
    add(entity: E): Observable<E>;
    delete(entity: E | number): Observable<E>;
    deleteAll(entities: E[]): Observable<E>;
    deleteAllTernario(entities: E[], columnDefSingleId: string, columnDefMultiId: string): Observable<E>;
    search(term: string): Observable<E[]>;
}