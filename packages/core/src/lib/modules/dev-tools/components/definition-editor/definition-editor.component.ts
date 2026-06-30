import { Component, ChangeDetectionStrategy, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, finalize } from 'rxjs';

import { DevToolsService } from '../../services/dev-tools.service';
import { NotificationService } from '../../../../services/notification/notification.service';
import { DialogService } from '../../../../services/dialog-service/dialog.service';
import { NAVIGATION_GROUPS_MAP } from 'app/core/navigation/navigation.groups';
import { FilterPipe } from '../../../../pipe/filter.pipe';
import { TranslatePipe } from '../../../../pipe/translate.pipe';
import { SanitizeHtmlPipe } from '../../../../pipe/sanitize-html.pipe';

import { NavigationEditorComponent } from './navigation-editor/navigation-editor.component';
import { SecurityEditorComponent } from './security-editor/security-editor.component';
import { CrudConfigEditorComponent } from './crud-config-editor/crud-config-editor.component';
import { GridEditorComponent } from './grid-editor/grid-editor.component';
import { FormsEditorComponent } from './forms-editor/forms-editor.component';
import { DashboardEditorComponent } from './dashboard-editor/dashboard-editor.component';

interface DefinitionItem { id: string; name: string; }

interface EditorSection {
    id: 'navigation' | 'security' | 'crud-config' | 'grid' | 'forms' | 'dashboard';
    title: string;
    icon: string;
    description: string;
}

@Component({
    selector: 'fwk-definition-editor',
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatListModule, MatProgressBarModule, MatIconModule, MatExpansionModule,
        MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, TitleCasePipe, FilterPipe,
        TranslatePipe, SanitizeHtmlPipe, MatMenuModule,
        NavigationEditorComponent,
        SecurityEditorComponent,
        CrudConfigEditorComponent,
        GridEditorComponent,
        FormsEditorComponent,
        DashboardEditorComponent
    ],
    templateUrl: './definition-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DefinitionEditorComponent implements OnInit, OnDestroy {
    private _devToolsService = inject(DevToolsService);
    private _notificationService = inject(NotificationService);
    private _dialogService = inject(DialogService);
    private _cdr = inject(ChangeDetectorRef);
    private _unsubscribeAll = new Subject<void>();

    definitions: DefinitionItem[] = [];
    selectedDefinition: DefinitionItem | null = null;
    definitionData: any = null;
    allPossibleFields: { key: string }[] = [];
    navigationGroups = [...NAVIGATION_GROUPS_MAP];

    isLoadingList = true;
    isLoadingDetail = false;
    isSidebarOpen = true;
    listFilter: string = '';

    public activeView: 'overview' | 'navigation' | 'security' | 'crud-config' | 'grid' | 'forms' | 'dashboard' | null = null;
    public availableSections: EditorSection[] = [];

    ngOnInit(): void {
        this.loadDefinitions();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    toggleSidebar(): void {
        this.isSidebarOpen = !this.isSidebarOpen;
    }

    loadDefinitions(): void {
        this.isLoadingList = true;
        this._cdr.markForCheck();
        this._devToolsService.getDefinitions().pipe(
            finalize(() => {
                this.isLoadingList = false;
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (defs) => { this.definitions = defs; },
            error: (err) => this._notificationService.notifyError(err.error?.message || 'No se pudieron cargar las definiciones.')
        });
    }

    selectDefinition(def: DefinitionItem): void {
        if (this.isLoadingDetail || this.selectedDefinition?.id === def.id) return;
        this.proceedWithSelection(def);
    }

    private proceedWithSelection(def: DefinitionItem): void {
        this.selectedDefinition = def;
        this.definitionData = null;
        this.isLoadingDetail = true;
        this.activeView = null;
        this._cdr.markForCheck();

        this._devToolsService.getDefinition(def.id).pipe(
            finalize(() => {
                this.isLoadingDetail = false;
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (data) => {
                this.definitionData = data;
                this.allPossibleFields = data.grid?.columnsDef?.map(c => ({ key: c.columnDef })) || [];
                this.availableSections = this.getAvailableSections();
                this.activeView = 'overview';
            },
            error: (err) => {
                this._notificationService.notifyError(err.error?.message || `Error al cargar la definición de ${def.name}.`);
                this.selectedDefinition = null;
            }
        });
    }

    selectSection(sectionId: 'overview' | 'navigation' | 'security' | 'crud-config' | 'grid' | 'forms' | 'dashboard'): void {
        this.activeView = sectionId;
        this._cdr.markForCheck();
    }

    goBackToOverview(): void {
        this.activeView = 'overview';
        this._cdr.markForCheck();
    }


    private getAvailableSections(): EditorSection[] {
        const allSections: EditorSection[] = [
            { id: 'navigation', title: 'Navegación', icon: 'heroicons_outline:queue-list', description: 'Gestiona la visibilidad y apariencia del módulo en el menú principal.' },
            { id: 'security', title: 'Seguridad', icon: 'heroicons_outline:shield-check', description: 'Define los permisos necesarios para acceder y realizar acciones.' },
            { id: 'crud-config', title: 'Configuración CRUD', icon: 'heroicons_outline:cog-8-tooth', description: 'Ajustes generales como paginación, filtros y exportación.' },
            { id: 'grid', title: 'Grilla', icon: 'heroicons_outline:table-cells', description: 'Configura las columnas, orden y acciones disponibles en la tabla.' },
            { id: 'forms', title: 'Formularios', icon: 'heroicons_outline:clipboard-document-list', description: 'Define los campos y comportamientos para los formularios de alta, edición y filtro.' },
            { id: 'dashboard', title: 'Dashboard', icon: 'heroicons_outline:chart-pie', description: 'Configura los widgets, gráficos y diseño de la página del dashboard.' }
        ];

        return allSections.filter(section => {
            if (this.definitionData?.dashboardConfig) {
                return ['navigation', 'security', 'dashboard'].includes(section.id);
            }
            if (this.definitionData?.grid) {
                return ['navigation', 'security', 'crud-config', 'grid', 'forms'].includes(section.id);
            }
            return false;
        });
    }
}