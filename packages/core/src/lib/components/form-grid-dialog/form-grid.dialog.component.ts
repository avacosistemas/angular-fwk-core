import { Component, Inject, OnInit, ChangeDetectionStrategy, forwardRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../pipe/translate.pipe';

import { Entity } from '../../model/entity';
import { GridDef } from '../../model/component-def/grid-def';
import { ActionDef } from '../../model/component-def/action-def';
import { ActionDefService } from '../../services/action-def-service/action-def.service';
import { DynamicField } from '../../model/dynamic-form/dynamic-field';
import { I18n } from '../../model/i18n';
import { I18nService } from '../../services/i18n-service/i18n.service';

import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { CrudTableComponent } from '../crud/crud-table/crud-table.component';

interface FormGridDialogData {
    entity?: Entity;
    isEdit?: boolean;
    dialog: {
        modalKey?: string;
        modalName?: string;
        form?: {
            fields: DynamicField<any>[];
        };
        grids?: GridDef[];
        actions?: ActionDef[];
    };
    i18n: I18n;
    onSubmitActions?: (action: ActionDef, entity: Entity) => void;
}

@Component({
     selector: 'fwk-form-grid-modal-component',
    templateUrl: './form-grid.dialog.component.html',
    styleUrls: ['./form-grid.dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        DynamicFormComponent,
        forwardRef(() => CrudTableComponent),
        TranslatePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormGridModalComponent implements OnInit {

    entity: Entity;
    form: FormGroup;
    isEdit: boolean;

    formKey: string = 'subForm';
    isAdd: boolean = false;
    submitLabel: string;
    isObjectModified: boolean = false;
    submitting: boolean = false;

    private i18nService = inject(I18nService);

    constructor(
        public dialogRef: MatDialogRef<FormGridModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: FormGridDialogData,
        private activatedRoute: ActivatedRoute,
        private actionDefService: ActionDefService,
    ) {
        this.dialogRef.disableClose = true;
        this.isEdit = this.data.isEdit ?? false;
        this.entity = this.data.entity ?? new Entity();
        this.form = new FormGroup({});
        this.submitLabel = this.translate('modal_button_save');
    }

    ngOnInit(): void { }

    private translate(key: string): string {
        return this.i18nService.getDictionary('fwk')?.translate?.(key) || key;
    }

    getDataSource(grid: GridDef, entity: Entity | undefined): MatTableDataSource<any> {
        const dataArray = (grid.fromArrayField && entity) ? (entity as any)[grid.fromArrayField] : [];
        return new MatTableDataSource<any>(Array.isArray(dataArray) ? dataArray : []);
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    getUrl(): string {
        return this.activatedRoute.snapshot.firstChild?.routeConfig?.path ?? '';
    }

    submitAction(action: ActionDef): void {
        if (this.data.onSubmitActions) {
            this.data.onSubmitActions(action, this.entity);
        } else {
            this.actionDefService.submitAction(action, this.entity, this.data.i18n, undefined).subscribe();
        }
    }

    get titleLabel(): string {
        return this.data.dialog?.modalName ?? this.translate('grid_modal_default_title');
    }

    objectModified(event: any): void {
        this.isObjectModified = true;
    }

    onChangeEntity(event: any): void {
        this.entity = event;
    }

    onSubmit(): void {
        if (this.form.invalid) {
            return;
        }
        this.dialogRef.close(this.entity);
    }
}