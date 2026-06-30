import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin, lastValueFrom, map, Observable, of, catchError } from 'rxjs';

interface IconSet {
    url: string;
    isNamespace: boolean;
    namespace?: string;
}

interface LoadedIconSet extends IconSet {
    svgContent: string;
}

@Injectable({ providedIn: 'root' })
export class IconsService {
    constructor(
        private domSanitizer: DomSanitizer,
        private matIconRegistry: MatIconRegistry,
        private httpClient: HttpClient
    ) {
    }

    private _iconNameCache = new Map<string, string[]>();

    load(): Promise<any> {
        const iconSets: IconSet[] = [
            { url: 'assets/icons/heroicons-outline.svg', isNamespace: true, namespace: 'heroicons_outline' },
            { url: 'assets/icons/heroicons-solid.svg', isNamespace: true, namespace: 'heroicons_solid' },
            { url: 'assets/icons/heroicons-mini.svg', isNamespace: true, namespace: 'heroicons_mini' },
            { url: 'assets/icons/material-outline.svg', isNamespace: true, namespace: 'mat_outline' },
            { url: 'assets/icons/material-solid.svg', isNamespace: true, namespace: 'mat_solid' },
            // { url: 'assets/icons/material-twotone.svg', isNamespace: true, namespace: 'mat_twotone' },
        ];

        const requests: Observable<LoadedIconSet>[] = iconSets.map(set =>
            this.httpClient.get(set.url, { responseType: 'text' }).pipe(
                catchError((error) => {
                    console.error(
                        `[IconsService] ¡ERROR CRÍTICO! No se pudo cargar el set de iconos desde '${set.url}'. ` +
                        `Verifica que el archivo exista y sea accesible. Error: ${error.status} ${error.statusText}`
                    );
                    return of(''); 
                }),
                map(svg => ({ ...set, svgContent: svg }))
            )
        );

        return lastValueFrom(forkJoin(requests).pipe(
            map(loadedIconSets => {
                loadedIconSets.forEach(loadedSet => {
                    if (!loadedSet.svgContent) {
                        return;
                    }

                    let correctedSvgContent = loadedSet.svgContent
                        .replace(/<svg id="/g, '<symbol id="')
                        .replace(/<\/svg>/g, '</symbol>');

                    const safeSvg: SafeHtml = this.domSanitizer.bypassSecurityTrustHtml(correctedSvgContent);
                    
                    if (loadedSet.isNamespace && loadedSet.namespace) {
                        this.matIconRegistry.addSvgIconSetLiteralInNamespace(loadedSet.namespace, safeSvg);
                        
                        const iconNames = this.parseSvgSprite(correctedSvgContent);
                        this._iconNameCache.set(loadedSet.namespace, iconNames);
                        // console.log(`[IconsService] Set de iconos '${loadedSet.namespace}' cargado con ${iconNames.length} iconos.`);

                    } else {
                        this.matIconRegistry.addSvgIconSetLiteral(safeSvg);
                    }
                });
            })
        ));
    }

    public getIconNames(namespace: string): string[] {
        return this._iconNameCache.get(namespace) || [];
    }

    private parseSvgSprite(svgText: string): string[] {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, 'image/svg+xml');
            const symbols = doc.querySelectorAll('symbol');
            if (symbols.length === 0) {
                 const svgTagsWithId = doc.querySelectorAll('svg[id]');
                 if (svgTagsWithId.length > 0) {
                    console.warn(`[IconsService] El archivo SVG parece tener un formato no estándar (svg anidados). Se intentó corregir. Nombres encontrados: ${svgTagsWithId.length}`);
                    return Array.from(svgTagsWithId).map(svg => svg.id).sort((a, b) => a.localeCompare(b));
                 }
            }
            return Array.from(symbols).map(symbol => symbol.id).sort((a, b) => a.localeCompare(b));
        } catch (e) {
            console.error('[IconsService] Error al parsear el archivo SVG de iconos:', e);
            return [];
        }
    }
}