import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IconsService } from '../icons.service';

@Injectable({ providedIn: 'root' })
export class IconListService {
    constructor(private _iconsService: IconsService) {}


    public getIconNames(namespace: string): Observable<string[]> {
        const names = this._iconsService.getIconNames(namespace);

        if (names.length === 0) {
            console.error(`[IconListService] No se encontraron iconos para el namespace '${namespace}'. ¿Está registrado en IconsService.load()?`);
        }
        
        return of(names);
    }
}