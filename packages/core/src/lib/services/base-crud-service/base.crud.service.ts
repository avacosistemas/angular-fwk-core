import { Injectable, Injector } from '@angular/core';
import { CrudService } from '../crud-service/crud.service';

@Injectable({
  providedIn: 'root'
})
export class BaseCrudService extends CrudService<any> {

  constructor(protected override injector: Injector) {
    super('', injector);
  }

  setBaseURL(url: string): void {
    this.baseUrl = url;
  }
}