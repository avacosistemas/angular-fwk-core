import { Component, ChangeDetectionStrategy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { finalize } from 'rxjs';

import { DevToolsService } from '../../services/dev-tools.service';
import { NotificationService } from '../../../../services/notification/notification.service';
import { DialogService } from '../../../../services/dialog-service/dialog.service';
import { BasicModalComponent } from '../../../../components/crud/basic-modal/basic-modal.component';
import { DynamicField } from '../../../../model/dynamic-form/dynamic-field';
import { DevToolsStateService } from '../../services/dev-tools-state.service';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

export interface NavigationGroup {
    id: string;
    title: string;
    type: 'group' | 'collapsable'; 
    icon?: string | null;
}

@Component({
    selector: 'fwk-nav-group-manager',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressBarModule, TranslatePipe],
    templateUrl: './nav-group-manager.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavGroupManagerComponent implements OnInit {
    private _devToolsService = inject(DevToolsService);
    private _notificationService = inject(NotificationService);
    private _dialogService = inject(DialogService);
    private _cdr = inject(ChangeDetectorRef);
    private _dialog = inject(MatDialog);
    private _devToolsStateService = inject(DevToolsStateService);

    isLoading = true;
    isSaving = false;
    groups: NavigationGroup[] = [];
    dataSource = new MatTableDataSource<NavigationGroup>();
    displayedColumns: string[] = ['icon', 'title', 'id', 'type', 'actions'];

    ngOnInit(): void {
        this.loadGroups();
    }

    loadGroups(): void {
        this.isLoading = true;
        this._cdr.markForCheck();
        this._devToolsService.getNavigationGroups().pipe(
            finalize(() => {
                this.isLoading = false;
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (groups) => {
                this.groups = groups;
                this.dataSource.data = this.groups;
            },
            error: (err) => this._notificationService.notifyError(err.error?.message || 'No se pudieron cargar los grupos de navegación.')
        });
    }

    openGroupDialog(group?: NavigationGroup): void {
        const isEdit = !!group;
        const iconNamespace = 'heroicons_outline';

        const formFields: DynamicField<any>[] = [
            {
                key: 'id',
                label: 'ID (único, sin espacios)',
                controlType: 'textbox',
                required: true,
                disabled: isEdit,
                validation: { regexKey: 'user', errorMessage: 'Solo letras, números y guiones bajos/medios.' }
            },
            {
                key: 'title',
                label: 'Título (visible en el menú)',
                controlType: 'textbox',
                required: true
            },
            {
                key: 'type',
                label: 'Tipo de Menú',
                controlType: 'select',
                required: true,
                options: {
                    fromData: [
                        { value: 'collapsable', label: 'Colapsable (Menú con hijos)' },
                        { value: 'group', label: 'Grupo (Título separador)' }
                    ],
                    elementLabel: 'label',
                    elementValue: 'value'
                }
            },
            {
                key: 'icon',
                label: 'Ícono (ej: heroicons_outline:users)',
                controlType: 'icon-picker',
                options: {
                    namespace: iconNamespace
                }
            }
        ];

        const entityForModal: Partial<NavigationGroup> = group
            ? { ...group }
            : { type: 'collapsable' };

        if (isEdit && entityForModal.icon && entityForModal.icon.startsWith(`${iconNamespace}:`)) {
            entityForModal.icon = entityForModal.icon.split(':')[1];
        }

        const dialogRef = this._dialog.open(BasicModalComponent, {
            width: '450px',
            data: {
                entity: entityForModal,
                config: {
                    titleKey: isEdit ? 'Editar Grupo' : 'Nuevo Grupo de Navegación',
                    form: formFields,
                    submitButtonKey: 'Guardar'
                },
                submit: {
                    onSubmitModal: (entity: any, modal: any) => {
                        const finalEntity: NavigationGroup = { ...entity };

                        if (finalEntity.icon && !finalEntity.icon.startsWith(`${iconNamespace}:`)) {
                            finalEntity.icon = `${iconNamespace}:${finalEntity.icon}`;
                        } else if (!finalEntity.icon) {
                            finalEntity.icon = null;
                        }

                        if (isEdit) {
                            const index = this.groups.findIndex(g => g.id === group.id);
                            if (index > -1) this.groups[index] = finalEntity;
                        } else {
                            if (this.groups.some(g => g.id === finalEntity.id)) {
                                this._notificationService.notifyError(`El ID '${finalEntity.id}' ya existe.`);
                                return;
                            }
                            this.groups.push(finalEntity);
                        }
                        this.saveGroups();
                        modal.close();
                    }
                }
            }
        });
    }

    deleteGroup(groupToDelete: NavigationGroup): void {
        this._dialogService.showQuestionModal({
            title: 'Confirmar Eliminación',
            message: `¿Estás seguro de que deseas eliminar el grupo "${groupToDelete.title}"? Esta acción no se puede deshacer.`,
            actions: { confirm: { label: 'Eliminar', color: 'warn' } },
            onSubmit: () => {
                this.groups = this.groups.filter(g => g.id !== groupToDelete.id);
                this.saveGroups();
            }
        });
    }

    private saveGroups(): void {
        this.isSaving = true;
        this._cdr.markForCheck();

        const sortedGroups = [...this.groups].sort((a, b) => a.title.localeCompare(b.title));

        this._devToolsService.updateNavigationGroups(sortedGroups).pipe(
            finalize(() => {
                if (this.isSaving) {
                    this.isSaving = false;
                    this.loadGroups();
                }
            })
        ).subscribe({
            next: (res) => {
                this._devToolsStateService.show(res.message || 'Grupos de navegación guardados con éxito.');
            },
            error: (err) => this._notificationService.notifyError(err.error?.message || 'Error al guardar los grupos.')
        });
    }
}