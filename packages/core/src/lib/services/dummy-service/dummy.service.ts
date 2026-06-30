import { Injectable, Injector } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { SetUpDummyDataService } from './setup-dummy-data.service';

interface Cache {
  [url: string]: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DummyService {

  private localStorageService: LocalStorageService;
  private setUpDummyDataService: SetUpDummyDataService;

  constructor(private injector: Injector) {
    this.localStorageService = this.injector.get(LocalStorageService);

    this.setUpDummyDataService = this.injector.get(SetUpDummyDataService);

    this.initializeDataIfNeeded();
  }

  private initializeDataIfNeeded(): void {
    const value = this.localStorageService.get('mock_data_storage');
    if (value == null) {
      // this.setUpDummyDataService.initializeDummyData();
      this.localStorageService.save('mock_data_storage', true);
    }
  }

  private getCache(url: string): Cache {
    let cache: Cache | null = this.localStorageService.get('dummy_service');
    if (!cache) {
      cache = {};
    }
    if (!cache[url]) {
      cache[url] = [];
    }
    return cache;
  }

  private saveCache(cache: Cache): void {
    this.localStorageService.save('dummy_service', cache);
  }

  httpGet(url: string): Observable<any[]> {
    const cache = this.getCache(url);
    const data = this.localStorageService.clone(cache[url]);
    return of(data);
  }

  httpPut(url: string, entity: { id: any }): Observable<any> {
    const cache = this.getCache(url);

    const index = cache[url].findIndex(item => item.id === entity.id);
    if (index !== -1) {
      cache[url][index] = entity;
    } else {
      cache[url].push(entity);
    }

    this.saveCache(cache);
    const data = this.localStorageService.clone(entity);
    return of(data);
  }

  httpPost(url: string, entity: { id?: any }): Observable<any> {
    const cache = this.getCache(url);

    entity.id = cache[url].length + 1;
    cache[url].push(entity);

    this.saveCache(cache);
    const data = this.localStorageService.clone(entity);
    return of(data);
  }

  httpDelete(url: string, ids: number[]): Observable<void> {
    const cache = this.getCache(url);

    if (cache[url]) {
      const idsSet = new Set(ids);
      cache[url] = cache[url].filter(el => !idsSet.has(el.id));
    }

    this.saveCache(cache);
    return of(undefined);
  }
}