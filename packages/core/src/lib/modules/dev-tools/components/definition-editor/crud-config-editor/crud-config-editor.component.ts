import { Component, ChangeDetectionStrategy, inject, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';

import { TranslatePipe } from '../../../../../pipe/translate.pipe';
import { DevToolsService } from '../../../services/dev-tools.service';
import { DevToolsStateService } from '../../../services/dev-tools-state.service';
import { NotificationService } from '../../../../../services/notification/notification.service';

@Component({
    selector: 'fwk-crud-config-editor',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule, MatSelectModule,
        MatTooltipModule, TranslatePipe
    ],
    templateUrl: './crud-config-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrudConfigEditorComponent implements OnChanges {
    @Input() definitionId: string;

    private _crudConfigData: any;
    @Input()
    set crudConfigData(value: any) {
        this._crudConfigData = value || {};
    }
    get crudConfigData(): any {
        return this._crudConfigData;
    }

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _devToolsStateService = inject(DevToolsStateService);
    private _notificationService = inject(NotificationService);
    private _cdr = inject(ChangeDetectorRef);

    crudConfigForm: FormGroup;
    isSaving = false;

    constructor() {
        this.crudConfigForm = this._fb.group({
            serverPagination: [true],
            filterInMemory: [false],
            cancelInitSearch: [false],
            pageSize: [10, Validators.min(1)],
            dialogWidth: ['600px'],
            exportCsv: this._fb.group({
                type: ['none'],
                csvExportFileName: [''],
                ws: ['']
            })
        });
        this.crudConfigForm.disable();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['crudConfigData'] && this.crudConfigData) {
            const cleanString = (str, replacements = []) => {
                if (typeof str !== 'string') return str;
                let result = str.replace(/%%/g, '');
                replacements.forEach(rep => {
                    result = result.replace(rep, '');
                });
                return result.trim();
            };

            const dataToPatch = {
                serverPagination: this.crudConfigData.serverPagination,
                filterInMemory: this.crudConfigData.filterInMemory,
                cancelInitSearch: this.crudConfigData.cancelInitSearch,
                pageSize: this.crudConfigData.pagination?.pageSize,
                dialogWidth: this.crudConfigData.dialogConfig?.width,
                exportCsv: {
                    type: this.crudConfigData.exportCsv?.type || 'none',
                    csvExportFileName: cleanString(this.crudConfigData.exportCsv?.csvExportFileName, [/'/g, /\.csv/g]),
                    ws: cleanString(this.crudConfigData.exportCsv?.ws, ["PREFIX_DOMAIN_API + '", "'"])
                }
            };

            this.crudConfigForm.patchValue(dataToPatch);
            this.crudConfigForm.enable();
            this.crudConfigForm.markAsPristine();
            this._cdr.markForCheck();
        }
    }

    saveCrudConfig(): void {
        if (!this.crudConfigForm.dirty) {
            this._notificationService.notify('No hay cambios para guardar.');
            return;
        }

        this.isSaving = true;
        this.crudConfigForm.disable();
        this._cdr.markForCheck();

        const payload = this.crudConfigForm.getRawValue();

        this._devToolsService.updateCrudConfigDefinition(this.definitionId, payload).pipe(
            finalize(() => {
                this.isSaving = false;
                this.crudConfigForm.enable();
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (res) => {
                this.crudConfigForm.markAsPristine();
                this._devToolsStateService.show(res.message);
            },
            error: (err) => {
                this._notificationService.notifyError(err.error?.message || 'Error al guardar la configuración del CRUD.');
            }
        });
    }
}