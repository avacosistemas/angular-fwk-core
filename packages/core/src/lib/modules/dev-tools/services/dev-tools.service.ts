import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AbstractAuthService } from '../../../auth/abstract-auth.service';
import { Observable, throwError } from 'rxjs';
import { NavigationGroup } from '../components/nav-group-manager/nav-group-manager.component';

@Injectable({ providedIn: 'root' })
export class DevToolsService {
    private _devApiUrl = 'http://localhost:4201/api/dev';

    constructor(
        private _httpClient: HttpClient,
        private _authService: AbstractAuthService,
    ) {}

    getSwaggerEndpoints(): Observable<{ path: string, summary: string }[]> {
        console.log('[DEV-SERVICE] Pidiendo endpoints de Swagger al dev-server...');
        return this._httpClient.get<{ path: string, summary: string }[]>(`${this._devApiUrl}/swagger-endpoints`);
    }

    scanEndpoint(endpoint: string): Observable<any> {
        const token = this._authService.getToken();
        if (!token) {
            console.error('[DEV-SERVICE] No se encontró token de autenticación. Imposible escanear.');
            return throwError(() => new Error("No hay token de autenticación para escanear el endpoint."));
        }

        console.log('[DEV-SERVICE] Llamando al dev-server para escanear el endpoint:', endpoint);
        return this._httpClient.post(`${this._devApiUrl}/scan-endpoint`, { endpoint, token });
    }

    generateCrud(config: any): Observable<any> {
        console.log('[DEV-SERVICE] Enviando configuración final al dev-server para generar CRUD:', config);
        return this._httpClient.post(`${this._devApiUrl}/generate-crud`, config);
    }

    generateDashboard(config: any): Observable<any> {
        console.log('[DEV-SERVICE] Enviando configuración final al dev-server para generar Dashboard:', config);
        return this._httpClient.post(`${this._devApiUrl}/generate-dashboard`, config);
    }

    getNavigationGroups(): Observable<NavigationGroup[]> {
        console.log('[DEV-SERVICE] Obteniendo grupos de navegación del dev-server...');
        return this._httpClient.get<NavigationGroup[]>(`${this._devApiUrl}/navigation-groups`);
    }

    updateNavigationGroups(groups: NavigationGroup[]): Observable<any> {
        console.log('[DEV-SERVICE] Enviando grupos de navegación actualizados al dev-server...');
        return this._httpClient.post(`${this._devApiUrl}/navigation-groups`, { groups });
    }

    getDefinitions(): Observable<{ id: string, name: string }[]> {
        console.log('[DEV-SERVICE] Obteniendo lista de definiciones del dev-server...');
        return this._httpClient.get<{ id: string, name: string }[]>(`${this._devApiUrl}/definitions`);
    }

    getDefinition(name: string): Observable<any> {
        console.log(`[DEV-SERVICE] Obteniendo detalles de la definición '${name}'...`);
        return this._httpClient.get<any>(`${this._devApiUrl}/definition/${name}`);
    }

    updateDefinition(name: string, data: any): Observable<any> {
        console.log(`[DEV-SERVICE] Guardando cambios para la definición '${name}'...`);
        return this._httpClient.post(`${this._devApiUrl}/definition/${name}`, data);
    }

    getMainI18nData(): Observable<any> {
        console.log('[DEV-SERVICE] Obteniendo datos de I18N principal del dev-server...');
        return this._httpClient.get<any>(`${this._devApiUrl}/i18n-main`);
    }

    updateMainI18nData(data: any): Observable<any> {
        console.log('[DEV-SERVICE] Enviando datos de I18N principal actualizados al dev-server...');
        return this._httpClient.post(`${this._devApiUrl}/i18n-main`, data);
    }

    updateNavigationDefinition(name: string, data: any): Observable<any> {
        console.log(`[DEV-SERVICE] Guardando cambios de NAVEGACIÓN para '${name}'...`);
        return this._httpClient.post(`${this._devApiUrl}/definition/${name}/navigation`, data);
    }

    updateSecurityDefinition(name: string, data: any): Observable<any> {
        console.log(`[DEV-SERVICE] Guardando cambios de SEGURIDAD para '${name}'...`);
        return this._httpClient.post(`${this._devApiUrl}/definition/${name}/security`, data);
    }

    updateCrudConfigDefinition(name: string, data: any): Observable<any> {
        console.log(`[DEV-SERVICE] Guardando CAMBIOS DE CONFIG CRUD para '${name}'...`);
        return this._httpClient.post(`${this._devApiUrl}/definition/${name}/crud-config`, data);
    }

    updateGridDefinition(name: string, data: any): Observable<any> {
        console.log(`[DEV-SERVICE] Guardando CAMBIOS DE GRID para '${name}'...`);
        return this._httpClient.post(`${this._devApiUrl}/definition/${name}/grid`, data);
    }

    updateFormsDefinition(name: string, data: any): Observable<any> {
        console.log(`[DEV-SERVICE] Guardando CAMBIOS DE FORMULARIOS para '${name}'...`);
        return this._httpClient.post(`${this._devApiUrl}/definition/${name}/forms`, data);
    }

    updateDashboardDefinition(name: string, data: any): Observable<any> {
        console.log(`[DEV-SERVICE] Guardando CAMBIOS DE DASHBOARD para '${name}'...`);
        return this._httpClient.post(`${this._devApiUrl}/definition/${name}/dashboard-config`, data);
    }
}