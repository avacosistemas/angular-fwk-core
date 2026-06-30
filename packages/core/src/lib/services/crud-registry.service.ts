import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CrudRegistryService {
  public static instance: CrudRegistryService;
  private _registry: Map<string, () => Promise<any>> = new Map();

  constructor() {
    if (!CrudRegistryService.instance) {
      CrudRegistryService.instance = this;
    }
    
    return CrudRegistryService.instance;
  }

  register(name: string, loaderFn: () => Promise<any>): void {
    this._registry.set(name, loaderFn);
  }

  get(name: string): Promise<any> {
    const loader = this._registry.get(name);
    if (!loader) {
      console.error(`[FWK Registry] No se encontró un loader para el CRUD: '${name}'`);
      return Promise.reject(`No loader found for CRUD: '${name}'`);
    }
    return loader();
  }
}