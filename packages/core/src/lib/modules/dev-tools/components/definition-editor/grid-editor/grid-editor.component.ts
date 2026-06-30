import { Component, ChangeDetectionStrategy, inject, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, AbstractControl, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { toConstCase, keyToLabel } from '../../../dev-tools.utils';
import { TranslatePipe } from '../../../../../pipe/translate.pipe';
import { SanitizeHtmlPipe } from '../../../../../pipe/sanitize-html.pipe';
import { IconPickerComponent } from '../../../../../components/icon-picker/icon-picker.component';
import { DevToolsService } from '../../../services/dev-tools.service';
import { DevToolsStateService } from '../../../services/dev-tools-state.service';
import { NotificationService } from '../../../../../services/notification/notification.service';
import { BasicModalComponent } from '../../../../../components/crud/basic-modal/basic-modal.component';
import { DynamicField } from '../../../../../model/dynamic-form/dynamic-field';
import { FieldDefinitionModalComponent } from '../../field-definition-modal/field-definition-modal.component';

@Component({
    selector: 'fwk-grid-editor',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, DragDropModule, MatExpansionModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule, MatSelectModule,
        MatTooltipModule, MatTableModule, MatCheckboxModule, TranslatePipe, SanitizeHtmlPipe, IconPickerComponent
    ],
    templateUrl: './grid-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridEditorComponent implements OnChanges {
    @Input() definitionId: string;
    @Input() allPossibleFields: { key: string }[] = [];

    private _gridData: any;
    @Input()
    set gridData(value: any) {
        this._gridData = value || { columnsDef: [], displayedColumns: [], actions: [] };
    }
    get gridData(): any {
        return this._gridData;
    }

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _devToolsStateService = inject(DevToolsStateService);
    private _notificationService = inject(NotificationService);
    private _dialog = inject(MatDialog);
    private _cdr = inject(ChangeDetectorRef);

    gridForm: FormGroup;
    isSaving = false;

    gridColumnsDataSource = new MatTableDataSource<AbstractControl>();
    gridColDisplayedColumns: string[] = ['key', 'columnNameValue', 'actions'];

    actionTypeChoices = ['redirect', 'form_modal', 'grid_modal', 'file_download', 'file_preview'];
    httpMethods = ['POST', 'PUT', 'DELETE', 'GET'];
    behaviorComparators = ['EQUALS', 'NOTEQUALS', 'GREATER', 'LESS', 'GREATER_EQUALS', 'LESS_EQUALS', 'HAS_VALUE', 'LIKE'];
    private actionFormDefs = new Map<number, DynamicField<any>[]>();

    get gridColumnsDef(): FormArray { return this.gridForm.get('columnsDef') as FormArray; }
    get gridDisplayedColumnsArr(): FormArray { return this.gridForm.get('displayedColumns') as FormArray; }
    get gridActions(): FormArray { return this.gridForm.get('actions') as FormArray; }

    constructor() {
        this.gridForm = this._fb.group({
            columnsDef: this._fb.array([]),
            displayedColumns: this._fb.array([]),
            actions: this._fb.array([]),
            actionCellClass: [''],
            groupActions: [true],
            deleteAction: [false],
            sortAllColumns: [true]
        });
        this.gridForm.disable();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['gridData'] && this.gridData) {
            this.patchGridForm(this.gridData);
        }
    }

    private patchGridForm(data: any): void {
        this.gridForm.reset({}, { emitEvent: false });
        this.gridColumnsDef.clear({ emitEvent: false });
        this.gridDisplayedColumnsArr.clear({ emitEvent: false });
        this.gridActions.clear({ emitEvent: false });
        this.actionFormDefs.clear();

        this.gridForm.patchValue({
            actionCellClass: data.actionCellClass || '',
            groupActions: data.groupActions !== false,
            deleteAction: data.deleteAction === true,
            sortAllColumns: data.sortAllColumns === true
        }, { emitEvent: false });

        if (Array.isArray(data.columnsDef)) {
            data.columnsDef.forEach(columnData => this.gridColumnsDef.push(this.createGridColumnGroup(columnData), { emitEvent: false }));
        }
        this.gridColumnsDataSource.data = this.gridColumnsDef.controls;

        if (Array.isArray(data.displayedColumns)) {
            data.displayedColumns.forEach(columnKey => this.gridDisplayedColumnsArr.push(this._fb.control(columnKey), { emitEvent: false }));
        }

        if (Array.isArray(data.actions)) {
            data.actions.forEach((actionData, index) => {
                const displayConditionData = data.displayedActionsCondition?.find(c => c.key === actionData.actionNameKey);
                this.gridActions.push(this.createActionGroup(actionData, displayConditionData), { emitEvent: false });
                if (actionData.formDef?.fields) {
                    this.actionFormDefs.set(index, actionData.formDef.fields);
                }
            });
        }

        this.gridForm.enable();
        this.gridForm.markAsPristine();
        this._cdr.markForCheck();
    }

    saveGridConfig(): void {
        if (!this.gridForm.dirty) {
            this._notificationService.notify('No hay cambios para guardar.');
            return;
        }

        this.isSaving = true;
        this.gridForm.disable();
        this._cdr.markForCheck();

        const i18nUpdates: Record<string, string> = {};
        const rawValue = this.gridForm.getRawValue();

        rawValue.columnsDef.forEach(col => {
            if (col.columnNameKey && col.columnNameValue) {
                i18nUpdates[col.columnNameKey] = col.columnNameValue;
            }
        });

        rawValue.actions = this.processActionsForSave(rawValue.actions, i18nUpdates);

        const payload = {
            gridData: rawValue,
            i18nUpdates: i18nUpdates
        };

        this._devToolsService.updateGridDefinition(this.definitionId, payload).pipe(
            finalize(() => {
                this.isSaving = false;
                this.gridForm.enable();
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (res) => {
                this.gridForm.markAsPristine();
                this._devToolsStateService.show(res.message);
            },
            error: (err) => this._notificationService.notifyError(err.error?.message || 'Error al guardar la configuración de la grilla.')
        });
    }

    private processActionsForSave(actions: any[], i18nUpdates: Record<string, string>): any[] {
        return actions.map((action, index) => {
            if (action.actionNameKey && action.actionNameValue) {
                i18nUpdates[action.actionNameKey] = action.actionNameValue;
            }

            let finalIcon = action.icon || undefined;
            if (finalIcon && !finalIcon.includes(':')) {
                finalIcon = `heroicons_outline:${finalIcon}`;
            }

            const finalAction: any = {
                actionNameKey: action.actionNameKey,
                icon: finalIcon,
                actionType: action.actionType,
                actionSecurity: action.actionSecurity || null
            };

            if (action.confirm) {
                finalAction.confirm = { message: action.confirmMessage || `¿Está seguro?` };
            }

            if (action.actionType === 'form_modal') {
                finalAction.formDef = {
                    fields: this.actionFormDefs.get(index) || [],
                    showSubmitContinue: action.showSubmitContinue
                };
            }

            const querystringObject = (action.querystring || []).reduce((acc: any, curr: any) => {
                if (curr.paramKey && curr.paramValue) { acc[curr.paramKey] = curr.paramValue; }
                return acc;
            }, {});

            if (action.actionType === 'redirect') {
                finalAction.redirect = { ...action.redirect };
                if (Object.keys(querystringObject).length > 0) {
                    finalAction.redirect.querystring = querystringObject;
                }
            } else if (action.ws?.url) {
                finalAction.ws = {
                    key: action.ws.key || `${action.actionNameKey}_ws`,
                    method: action.ws.method || 'POST',
                    url: action.ws.isRelative ? `%%PREFIX_DOMAIN_API + '${action.ws.url}'%%` : action.ws.url
                };
                if (Object.keys(querystringObject).length > 0) {
                    finalAction.ws.querystring = querystringObject;
                }
            }

            return finalAction;
        });
    }

    createGridColumnGroup(columnData: any): FormGroup {
        return this._fb.group({
            ...columnData,
            columnNameValue: [columnData.columnNameValue || ''],
            headerClass: [columnData.headerClass || ''],
            cellClass: [columnData.cellClass || ''],
            id: [columnData.id || false],
            columnType: [columnData.columnType || null]
        });
    }

    isColumnDisplayed(key: string): boolean { return this.gridDisplayedColumnsArr.controls.some(control => control.value === key); }

    toggleColumnDisplay(key: string, isChecked: boolean): void {
        const displayedArray = this.gridDisplayedColumnsArr;
        if (isChecked) {
            if (!this.isColumnDisplayed(key)) {
                displayedArray.push(this._fb.control(key));
            }
        } else {
            const index = displayedArray.controls.findIndex(control => control.value === key);
            if (index > -1) {
                displayedArray.removeAt(index);
            }
        }
        this.gridForm.markAsDirty();
    }

    dropDisplayedColumn(event: CdkDragDrop<AbstractControl[]>): void {
        moveItemInArray(this.gridColumnsDef.controls, event.previousIndex, event.currentIndex);
        const currentDisplayedSet = new Set(this.gridDisplayedColumnsArr.value);
        const newDisplayedOrder = this.gridColumnsDef.controls
            .map(control => control.value.columnDef)
            .filter(key => currentDisplayedSet.has(key));
        this.gridDisplayedColumnsArr.clear();
        newDisplayedOrder.forEach(key => this.gridDisplayedColumnsArr.push(this._fb.control(key)));
        this.gridForm.markAsDirty();
        this.gridColumnsDataSource.data = this.gridColumnsDef.controls;
    }

    editGridColumn(columnIndex: number): void {
        const columnControl = this.gridColumnsDef.at(columnIndex);

        const formFields: DynamicField<any>[] = [
            { key: 'columnDef', label: 'ID (Key)', controlType: 'textbox', required: true, disabled: true },
            { key: 'columnNameKey', label: 'Clave de Traducción (i18n)', controlType: 'textbox', required: true, disabled: true },
            { key: 'columnNameValue', label: 'Etiqueta (Texto visible)', controlType: 'textbox', required: true },
            { key: 'headerClass', label: 'Clase CSS (Cabecera)', controlType: 'textbox' },
            { key: 'cellClass', label: 'Clase CSS (Celda)', controlType: 'textbox' },
            { key: 'id', label: 'Es columna ID', controlType: 'checkbox' },
            {
                key: 'columnType',
                label: 'Tipo de Formato (para fechas, booleanos, etc.)',
                controlType: 'select',
                options: {
                    fromData: [
                        { value: null, label: 'Texto (por defecto)' },
                        { value: 'date', label: 'Fecha (dd/mm/yyyy)' },
                        { value: 'datehour', label: 'Fecha y Hora' },
                        { value: 'boolean', label: 'Booleano (Sí/No)' }
                    ],
                    elementLabel: 'label',
                    elementValue: 'value'
                }
            }
        ];

        this._dialog.open(BasicModalComponent, {
            width: '450px',
            data: {
                entity: columnControl.value,
                config: {
                    titleKey: `Editando Columna: ${columnControl.value.columnDef}`,
                    form: formFields,
                    submitButtonKey: 'Guardar'
                },
                submit: {
                    onSubmitModal: (entity: any, modal: MatDialogRef<any>) => {
                        columnControl.patchValue(entity);
                        this.gridForm.markAsDirty();
                        modal.close();
                    }
                }
            }
        });
    }

    addGridColumn(): void {
        const formFields: DynamicField<any>[] = [
            { key: 'columnDef', label: 'ID (Key) de la nueva columna', controlType: 'textbox', required: true },
            { key: 'columnNameValue', label: 'Etiqueta (Texto visible)', controlType: 'textbox', required: true }
        ];
        this._dialog.open(BasicModalComponent, { width: '450px', data: { entity: {}, config: { titleKey: 'Añadir Columna', form: formFields, submitButtonKey: 'Añadir' }, submit: { onSubmitModal: (entity: any, modal: MatDialogRef<any>) => { if (!this.definitionId) return; if (this.gridColumnsDef.value.some(c => c.columnDef === entity.columnDef)) { this._notificationService.notifyError(`La columna '${entity.columnDef}' ya existe.`); return; } const constName = toConstCase(this.definitionId); const newCol = { columnDef: entity.columnDef, columnNameKey: `${constName}_grid_def_column_${entity.columnDef.toLowerCase()}`, columnNameValue: entity.columnNameValue }; this.gridColumnsDef.push(this.createGridColumnGroup(newCol)); this.gridColumnsDataSource.data = this.gridColumnsDef.controls; this.gridForm.markAsDirty(); modal.close(); } } } });
    }

    removeGridColumn(index: number): void {
        const colKey = this.gridColumnsDef.at(index).value.columnDef;
        this.gridColumnsDef.removeAt(index);
        this.gridColumnsDataSource.data = this.gridColumnsDef.controls;
        const displayedIndex = this.gridDisplayedColumnsArr.value.findIndex(k => k === colKey);
        if (displayedIndex > -1) this.gridDisplayedColumnsArr.removeAt(displayedIndex);
        this.gridForm.markAsDirty();
    }

    createActionGroup(actionData?: any, displayConditionData?: any): FormGroup {
        const initialCompareValue = displayConditionData?.expression?.compare?.replace(/%%|FILTER_TYPE\./g, '') || 'EQUALS';

        const querystringData = actionData?.ws?.querystring || actionData?.redirect?.querystring;
        const querystringArray = querystringData
            ? Object.entries(querystringData).map(([key, value]) => this.createQuerystringGroup({ paramKey: key, paramValue: String(value) }))
            : [];

        const actionNameValue = actionData?.actionNameValue || '';
        let actionNameKey = actionData?.actionNameKey;
        if (!actionNameKey && actionNameValue) {
            const constName = toConstCase(this.definitionId);
            actionNameKey = `${constName}_grid_action_${actionNameValue.toLowerCase().replace(/ /g, '_')}`;
        }

        const group = this._fb.group({
            actionNameKey: [actionNameKey || ''],
            actionNameValue: [actionNameValue, Validators.required],
            icon: [actionData?.icon || ''],
            actionType: [actionData?.actionType || 'redirect', Validators.required],
            actionSecurity: [actionData?.actionSecurity || null],
            ws: this._fb.group({
                key: [actionData?.ws?.key || ''],
                url: [actionData?.ws?.url?.replace(/%%PREFIX_DOMAIN_API \+ '|'%%/g, '') || ''],
                method: [actionData?.ws?.method || 'POST'],
                isRelative: [!actionData?.ws?.url?.startsWith('http') && !actionData?.ws?.url?.startsWith('/')]
            }),
            confirm: [!!actionData?.confirm],
            confirmMessage: [(typeof actionData?.confirm === 'object' ? actionData.confirm.message : '') || ''],
            showSubmitContinue: [actionData?.formDef?.showSubmitContinue || false],
            querystring: this._fb.array(querystringArray),
            redirect: this._fb.group({
                url: [actionData?.redirect?.url || ''],
                openTab: [actionData?.redirect?.openTab || false]
            }),
            displayCondition: this._fb.group({
                expression: this._fb.group({
                    key: [displayConditionData?.expression?.key || null],
                    value: [displayConditionData?.expression?.value ?? ''],
                    compare: [initialCompareValue]
                })
            })
        });

        group.get('actionNameValue').valueChanges.subscribe(newName => {
            if (!this.definitionId) return;
            const constName = toConstCase(this.definitionId);
            const newKey = `${constName}_grid_action_${(newName || '').toLowerCase().replace(/ /g, '_')}`;
            group.get('actionNameKey').setValue(newKey, { emitEvent: false });
        });

        return group;
    }

    addAction(): void { this.gridActions.push(this.createActionGroup()); this.gridForm.markAsDirty(); }
    removeAction(index: number): void { this.gridActions.removeAt(index); this.actionFormDefs.delete(index); this.gridForm.markAsDirty(); }

    getActionFormDefCount(index: number): number { return this.actionFormDefs.get(index)?.length || 0; }

    defineActionForm(actionIndex: number): void {
        const actionControl = this.gridActions.at(actionIndex);
        const dialogRef = this._dialog.open(FieldDefinitionModalComponent, {
            width: '90vw', maxWidth: '1200px',
            data: { fields: this.actionFormDefs.get(actionIndex) || [], allAvailableFields: this.gridColumnsDef.getRawValue().map(c => ({ key: c.columnDef, label: c.columnNameValue })), actionName: actionControl.value.actionNameValue }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result && Array.isArray(result)) {
                this.actionFormDefs.set(actionIndex, result);
                this._notificationService.notifySuccess(`Formulario para "${actionControl.value.actionNameValue}" definido.`);
                this.gridForm.markAsDirty();
                this._cdr.markForCheck();
            }
        });
    }

    getQuerystringArray(actionIndex: number): FormArray { return this.gridActions.at(actionIndex).get('querystring') as FormArray; }
    createQuerystringGroup(data?: { paramKey: string, paramValue: string }): FormGroup { return this._fb.group({ paramKey: [data?.paramKey || '', Validators.required], paramValue: [data?.paramValue || '', Validators.required] }); }
    addQuerystringParam(actionIndex: number): void { this.getQuerystringArray(actionIndex).push(this.createQuerystringGroup()); this.gridForm.markAsDirty(); }
    removeQuerystringParam(actionIndex: number, paramIndex: number): void { this.getQuerystringArray(actionIndex).removeAt(paramIndex); this.gridForm.markAsDirty(); }
}