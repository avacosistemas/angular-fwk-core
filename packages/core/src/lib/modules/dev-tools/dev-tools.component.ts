import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { CrudGeneratorComponent } from './components/crud-generator/crud-generator.component';
import { DashboardGeneratorComponent } from './components/dashboard-generator/dashboard-generator.component';
import { NavGroupManagerComponent } from './components/nav-group-manager/nav-group-manager.component';
import { DefinitionEditorComponent } from './components/definition-editor/definition-editor.component';
import { I18nManagerComponent } from './components/i18n-manager/i18n-manager.component';
import { DevToolsStateService } from './services/dev-tools-state.service';
import { GenerationSuccessOverlayComponent } from './components/generation-success-overlay/generation-success-overlay.component';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '../../pipe/translate.pipe';

interface DevTool {
    id: string;
    titleKey: string;
    descriptionKey: string;
    actionKey: string;
    icon: string;
}

@Component({
    selector: 'fwk-dev-tools',
    standalone: true,
    imports: [
        CommonModule,
        AsyncPipe,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatListModule,
        CrudGeneratorComponent,
        DashboardGeneratorComponent,
        NavGroupManagerComponent,
        DefinitionEditorComponent,
        GenerationSuccessOverlayComponent,
        I18nManagerComponent,
        TranslatePipe
    ],
    templateUrl: './dev-tools.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevToolsComponent {
    private _devToolsStateService = inject(DevToolsStateService);
    private _cdr = inject(ChangeDetectorRef);
    
    overlayState$ = this._devToolsStateService.overlayState$;
    
    selectedTool: DevTool | null = null;

    tools: DevTool[] = [
        { id: 'crud-gen', titleKey: 'dev_tools_crud_gen_title', descriptionKey: 'dev_tools_crud_gen_desc', actionKey: 'Generar', icon: 'heroicons_outline:table-cells' },
        { id: 'dash-gen', titleKey: 'dev_tools_dash_gen_title', descriptionKey: 'dev_tools_dash_gen_desc', actionKey: 'Generar', icon: 'heroicons_outline:chart-pie' },
        { id: 'nav-gen', titleKey: 'dev_tools_nav_gen_title', descriptionKey: 'dev_tools_nav_gen_desc', actionKey: 'Crear/Editar', icon: 'heroicons_outline:list-bullet' },
        { id: 'i18n-gen', titleKey: 'dev_tools_i18n_gen_title', descriptionKey: 'dev_tools_i18n_gen_desc', actionKey: 'Editar', icon: 'heroicons_outline:language' },
        { id: 'def-editor', titleKey: 'dev_tools_def_editor_title', descriptionKey: 'dev_tools_def_editor_desc', actionKey: 'Editar', icon: 'heroicons_outline:code-bracket-square' },
    ];

    selectTool(toolId: string): void {
        const tool = this.tools.find(t => t.id === toolId);
        if (tool) {
            this.selectedTool = tool;
            this._cdr.markForCheck();
        }
    }

    goBackToTools(): void {
        this.selectedTool = null;
        this._cdr.markForCheck();
    }
}