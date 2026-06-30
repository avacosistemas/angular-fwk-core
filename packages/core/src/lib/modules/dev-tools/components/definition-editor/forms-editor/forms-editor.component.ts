import { Component, ChangeDetectionStrategy, inject, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, AbstractControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { toConstCase, keyToLabel } from '../../../dev-tools.utils';
import { TranslatePipe } from '../../../../../pipe/translate.pipe';
import { SanitizeHtmlPipe } from '../../../../../pipe/sanitize-html.pipe';
import { DevToolsService } from '../../../services/dev-tools.service';
import { DevToolsStateService } from '../../../services/dev-tools-state.service';
import { NotificationService } from '../../../../../services/notification/notification.service';
import { BasicModalComponent } from '../../../../../components/crud/basic-modal/basic-modal.component';
import { DynamicField } from '../../../../../model/dynamic-form/dynamic-field';
import { BehaviorDefinitionModalComponent } from '../../behavior-definition-modal/behavior-definition-modal.component';

@Component({
    selector: 'fwk-forms-editor',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
        MatIconModule, MatProgressSpinnerModule, MatSelectModule, MatTooltipModule, MatTableModule,
        MatCheckboxModule, MatTabsModule, TranslatePipe, SanitizeHtmlPipe
    ],
    templateUrl: './forms-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormsEditorComponent implements OnChanges {
    @Input() definitionId: string;
    @Input() allPossibleFields: { key: string }[] = [];

    private _formsData: any;
    @Input()
    set formsData(value: any) {
        this._formsData = value || {};
    }
    get formsData(): any {
        return this._formsData;
    }

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _devToolsStateService = inject(DevToolsStateService);
    private _notificationService = inject(NotificationService);
    private _dialog = inject(MatDialog);
    private _cdr = inject(ChangeDetectorRef);

    formsForm: FormGroup;
    isSaving = false;

    availableFormTypes: string[] = [];
    formFilterDataSource = new MatTableDataSource<AbstractControl>();
    formCreateDataSource = new MatTableDataSource<AbstractControl>();
    formUpdateDataSource = new MatTableDataSource<AbstractControl>();
    formReadDataSource = new MatTableDataSource<AbstractControl>();

    controlTypeChoices = ['textbox', 'number', 'textarea', 'email', 'password', 'datepicker', 'datetimepicker', 'checkbox', 'select', 'autocomplete', 'hidden', 'color_picker', 'tags', 'pick-list', 'simple-pick-list', 'file', 'url_input', 'icon-picker', 'disclaimer', 'float', 'date_read', 'date_time_read'];

    getFormArray(formType: string): FormArray | null { return this.formsForm.get(formType) as FormArray | null; }
    getBehaviorArray(formType: string): FormArray | null { return this.formsForm.get(`${formType}Behavior`) as FormArray | null; }

    formDisplayedColumns(formType: string): string[] {
        const baseCols = ['key', 'labelValue', 'controlType', 'actions'];
        if (formType === 'filter') {
            return ['key', 'baseFilter', 'labelValue', 'controlType', 'mappingQuerystring', 'actions'];
        }
        return baseCols;
    }

    constructor() {
        this.formsForm = this._fb.group({
            filter: this._fb.array([]),
            create: this._fb.array([]),
            update: this._fb.array([]),
            read: this._fb.array([]),
            filterBehavior: this._fb.array([]),
            createBehavior: this._fb.array([]),
            updateBehavior: this._fb.array([]),
        });
        this.formsForm.disable();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['formsData'] && this.formsData) {
            this.patchFormsForm(this.formsData);
        }
    }

    private patchFormsForm(data: any): void {
        this.formsForm.reset({}, { emitEvent: false });
        ['filter', 'create', 'update', 'read', 'filterBehavior', 'createBehavior', 'updateBehavior'].forEach(type => this.getFormArray(type)?.clear({ emitEvent: false }));

        this.availableFormTypes = Object.keys(data || {}).filter(key => !key.endsWith('Behavior'));

        ['filter', 'create', 'update', 'read'].forEach(type => {
            const formArray = this.getFormArray(type);
            if (formArray && Array.isArray(data?.[type])) {
                data[type].forEach(fieldData => formArray.push(this.createFormFieldGroup(fieldData), { emitEvent: false }));
                this.getDataSourceForFormType(type).data = formArray.controls;
            }

            const behaviorArray = this.getBehaviorArray(type);
            if (behaviorArray && Array.isArray(data?.[`${type}Behavior`])) {
                data[`${type}Behavior`].forEach(behaviorData => behaviorArray.push(this.createBehaviorGroup(behaviorData), { emitEvent: false }));
            }
        });

        this.formsForm.enable();
        this.formsForm.markAsPristine();
        this._cdr.markForCheck();
    }

    saveFormsConfig(): void {
        if (!this.formsForm.dirty) {
            this._notificationService.notify('No hay cambios para guardar.');
            return;
        }

        this.isSaving = true;
        this.formsForm.disable();
        this._cdr.markForCheck();

        const formsToUpdate: Record<string, any> = {};
        const i18nUpdates: Record<string, string> = {};

        Object.keys(this.formsForm.controls).forEach(formKey => {
            const formControl = this.formsForm.get(formKey) as FormArray;

            if (formControl.dirty) {
                const rawValue = formControl.getRawValue();

                if (formKey.endsWith('Behavior')) {
                    formsToUpdate[formKey] = rawValue;
                } else {
                    formsToUpdate[formKey] = rawValue.map(fieldFromForm => {
                        const {
                            labelValue,
                            baseFilter,
                            options,
                            validations,
                            ...restOfField
                        } = fieldFromForm;

                        const originalField = this._formsData[formKey]?.find(f => f.key === restOfField.key) || {};

                        const finalField: any = { ...originalField, ...restOfField };

                        const finalOptions = { ...(originalField.options || {}), ...(options || {}) };
                        if (baseFilter === true) {
                            finalOptions.baseFilter = true;
                        } else {
                            delete finalOptions.baseFilter;
                        }

                        Object.keys(finalOptions).forEach(key => {
                            if (finalOptions[key] === '' || finalOptions[key] === null || finalOptions[key] === 'none') {
                                delete finalOptions[key];
                            }
                        });

                        if (Object.keys(finalOptions).length > 0) {
                            finalField.options = finalOptions;
                        } else {
                            delete finalField.options;
                        }

                        if (validations?.pattern) {
                            finalField.validations = [{
                                key: 'pattern',
                                input: `%%${validations.pattern}%%`
                            }];
                        } else {
                            delete finalField.validations;
                        }

                        const booleanKeys: (keyof DynamicField<any>)[] = ['required', 'disabled', 'mappingQuerystring'];
                        booleanKeys.forEach(key => {
                            if (finalField[key] === false) {
                                delete finalField[key];
                            }
                        });

                        Object.keys(finalField).forEach(key => {
                            if (finalField[key] === null || finalField[key] === undefined || finalField[key] === '') {
                                delete finalField[key];
                            }
                        });

                        const originalLabelValue = originalField.labelValue || keyToLabel(originalField.key);
                        if (labelValue && labelValue !== originalLabelValue && finalField.labelKey) {
                            i18nUpdates[finalField.labelKey] = labelValue;
                        }

                        return finalField;
                    });
                }
            }
        });

        const payload = {
            formsData: formsToUpdate,
            i18nUpdates: i18nUpdates
        };

        if (Object.keys(payload.formsData).length === 0 && Object.keys(payload.i18nUpdates).length === 0) {
            this._notificationService.notify('No se detectaron cambios persistentes para guardar.');
            this.isSaving = false;
            this.formsForm.enable();
            this._cdr.markForCheck();
            return;
        }

        this._devToolsService.updateFormsDefinition(this.definitionId, payload).pipe(
            finalize(() => {
                this.isSaving = false;
                this.formsForm.enable();
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (res) => {
                this.formsForm.markAsPristine();
                this._devToolsStateService.show(res.message);
            },
            error: (err) => {
                this._notificationService.notifyError(err.error?.message || 'Error al guardar la configuración de formularios.');
            }
        });
    }

    openFieldOptions(fieldIndex: number, formType: string): void {
        const fieldControl = this.getFormArray(formType)?.at(fieldIndex) as FormGroup;
        if (!fieldControl) return;

        const entityForModal = fieldControl.getRawValue();

        const formFields: DynamicField<any>[] = [
            { key: 'general_header', controlType: 'header', label: 'Configuración General' },
            { key: 'cssClass', label: 'Clase CSS Adicional', controlType: 'textbox', cssClass: 'sm:col-span-2' },
            { key: 'mappingQuerystring', label: 'Mapear desde Query Param al cargar', controlType: 'checkbox', cssClass: 'sm:col-span-2' },

            { key: 'validations_header', controlType: 'header', label: 'Validaciones de Primer Nivel' },
            { key: 'minLength', label: 'Largo Mínimo (minLength)', controlType: 'number' },
            { key: 'maxLength', label: 'Largo Máximo (maxLength)', controlType: 'number' },
            { key: 'minValue', label: 'Valor Mínimo (minValue)', controlType: 'number' },
            { key: 'maxValue', label: 'Valor Máximo (maxValue)', controlType: 'number' },
            { key: 'length', label: 'Largo Exacto (length)', controlType: 'number' },

            { key: 'complex_validations_header', controlType: 'header', label: 'Validaciones Complejas (ValidationDef[])' },
            {
                key: 'validations.pattern', label: 'Regex Key (ej: REGEX_KEY_ONLY_NUMBERS)', controlType: 'textbox', cssClass: 'sm:col-span-2',
                labelKey: 'Este valor se guardará como { key: "pattern", input: ... }'
            },

            { key: 'messages_header', controlType: 'header', label: 'Mensajes de Error Personalizados' },
            { key: 'requiredMessage', label: 'Mensaje para "Requerido"', controlType: 'textbox' },
            { key: 'minLengthMessage', label: 'Mensaje para "Largo Mínimo"', controlType: 'textbox' },
            { key: 'maxLengthMessage', label: 'Mensaje para "Largo Máximo"', controlType: 'textbox' },
            { key: 'minValueMessage', label: 'Mensaje para "Valor Mínimo"', controlType: 'textbox' },
            { key: 'maxValueMessage', label: 'Mensaje para "Valor Máximo"', controlType: 'textbox' },
            { key: 'lengthMessage', label: 'Mensaje para "Largo Exacto"', controlType: 'textbox' },

            { key: 'options_header', controlType: 'header', label: 'Fuente de Datos (para Select/Autocomplete)' },
            { key: 'options.dataSourceType', label: 'Tipo de Fuente', controlType: 'select', options: { fromData: ['none', 'static', 'api'].map(v => ({ value: v, label: v })), elementLabel: 'label', elementValue: 'value' } },
            { key: 'options.fromData', label: 'Lista Estática (JSON)', controlType: 'textarea' },
            { key: 'options.fromWsUrl', label: 'URL de API', controlType: 'textbox' },
            { key: 'options.elementLabel', label: 'Campo para Etiqueta (ej: nombre)', controlType: 'textbox' },
            { key: 'options.elementValue', label: 'Campo para Valor (ej: id)', controlType: 'textbox' },
        ];

        this._dialog.open(BasicModalComponent, {
            width: '800px',
            data: {
                entity: entityForModal,
                config: {
                    modalKey: 'dev-tools-field-options',
                    titleKey: `Opciones para '${entityForModal.key}'`,
                    form: formFields,
                    submitButtonKey: 'Guardar'
                },
                submit: {
                    onSubmitModal: (entity: any, modal: MatDialogRef<any>) => {
                        fieldControl.patchValue(entity);

                        const formArray = this.getFormArray(formType);
                        if (formArray) {
                            formArray.markAsDirty();
                        }

                        this.formsForm.markAsDirty();

                        modal.close(true);
                    }
                }
            }
        });
    }

    getDataSourceForFormType(formType: string): MatTableDataSource<AbstractControl> {
        switch (formType) {
            case 'filter': return this.formFilterDataSource;
            case 'create': return this.formCreateDataSource;
            case 'update': return this.formUpdateDataSource;
            case 'read': return this.formReadDataSource;
            default: return new MatTableDataSource<AbstractControl>();
        }
    }

    createFormFieldGroup(fieldData: any): FormGroup {
        const validationDefs = Array.isArray(fieldData.validations) ? fieldData.validations : [];
        const patternValidation = validationDefs.find(v => v.key === 'pattern');

        return this._fb.group({
            key: [fieldData.key],
            labelKey: [fieldData.labelKey],
            controlType: [fieldData.controlType],
            labelValue: [fieldData.labelValue || ''],

            required: [fieldData.required || false],
            disabled: [fieldData.disabled || false],
            baseFilter: [fieldData.options?.baseFilter || false],
            mappingQuerystring: [fieldData.mappingQuerystring || false],
            cssClass: [fieldData.cssClass || ''],

            minLength: [fieldData.minLength || null],
            maxLength: [fieldData.maxLength || null],
            minValue: [fieldData.minValue || null],
            maxValue: [fieldData.maxValue || null],
            length: [fieldData.length || null],

            requiredMessage: [fieldData.requiredMessage || ''],
            minLengthMessage: [fieldData.minLengthMessage || ''],
            maxLengthMessage: [fieldData.maxLengthMessage || ''],
            minValueMessage: [fieldData.minValueMessage || ''],
            maxValueMessage: [fieldData.maxValueMessage || ''],
            lengthMessage: [fieldData.lengthMessage || ''],

            validations: this._fb.group({
                pattern: [patternValidation?.input?.replace(/%%/g, '') || null]
            }),

            options: this._fb.group({
                dataSourceType: [fieldData.options?.dataSourceType || 'none'],
                fromData: [fieldData.options?.fromData || ''],
                fromWsUrl: [fieldData.options?.fromWsUrl || ''],
                elementLabel: [fieldData.options?.elementLabel || ''],
                elementValue: [fieldData.options?.elementValue || '']
            })
        });
    }

    createBehaviorGroup(data?: any): FormGroup {
        return this._fb.group({
            fieldKey: [data?.fieldKey || '', Validators.required],
            condition: this._fb.group({
                if: this._fb.array(data?.condition?.if?.map(c => this.createConditionGroup(c)) || [this.createConditionGroup()]),
                then: this._fb.array(data?.condition?.then?.map(t => this.createThenElseGroup(t)) || []),
            })
        });
    }

    createConditionGroup(data?: any): FormGroup {
        return this._fb.group({
            key: [data?.key || '', Validators.required],
            compare: [data?.compare || 'EQUALS', Validators.required],
            value: [data?.value ?? '']
        });
    }

    createThenElseGroup(data?: any): FormGroup {
        return this._fb.group({
            key: [data?.key || '', Validators.required],
            required: [data?.required],
            disabled: [data?.disabled],
            controlType: [data?.controlType || null],
            value: [data?.value]
        });
    }

    addFormField(formType: string): void {
        const formArray = this.getFormArray(formType); if (!formArray) return;
        const choices = this.allPossibleFields.filter(field => !formArray.value.some(existing => existing.key === field.key)).map(field => ({ label: field.key, value: field.key }));
        const formFields: DynamicField<any>[] = [{ key: 'key', label: 'Selecciona un campo existente', controlType: 'select', required: true, options: { fromData: choices, elementLabel: 'label', elementValue: 'value' } }];
        this._dialog.open(BasicModalComponent, { width: '450px', data: { entity: { key: '' }, config: { titleKey: 'Añadir Campo a ' + formType, form: formFields, submitButtonKey: 'Añadir' }, submit: { onSubmitModal: (entity: any, modal: MatDialogRef<any>) => { if (!this.definitionId) return; const constName = toConstCase(this.definitionId); const newField = { key: entity.key, labelKey: `${constName}_${formType.toUpperCase()}_FORM_FIELDS_DEF_FIELD_${entity.key.toLowerCase()}`, labelValue: keyToLabel(entity.key), controlType: 'textbox' }; formArray.push(this.createFormFieldGroup(newField)); this.getDataSourceForFormType(formType).data = formArray.controls; this.formsForm.markAsDirty(); modal.close(); } } } });
    }

    removeFormField(formType: string, index: number): void {
        const formArray = this.getFormArray(formType);
        if (formArray) {
            formArray.removeAt(index);
            this.getDataSourceForFormType(formType).data = formArray.controls;
            this.formsForm.markAsDirty();
        }
    }

    hasBehavior(fieldIndex: number, formType: string): boolean {
        const fieldKey = this.getFormArray(formType)?.at(fieldIndex)?.value.key;
        if (!fieldKey) return false;
        return this.getBehaviorArray(formType)?.value.some(b => b.fieldKey === fieldKey);
    }

    openFieldBehaviors(fieldData: any, fieldIndex: number, formType: string): void {
        const behaviorArray = this.getBehaviorArray(formType);
        if (!behaviorArray) return;
        const dialogRef = this._dialog.open(BehaviorDefinitionModalComponent, {
            width: '90vw', maxWidth: '1200px',
            data: {
                behaviors: behaviorArray.value.filter(b => b.fieldKey === fieldData.key),
                availableFields: this.getFormArray(formType)?.value.map(f => ({ key: f.key, label: f.labelValue })),
                triggerFieldKey: fieldData.key
            }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result && Array.isArray(result)) {
                const otherBehaviors = behaviorArray.value.filter(b => b.fieldKey !== fieldData.key);
                behaviorArray.clear({ emitEvent: false });
                [...otherBehaviors, ...result].forEach(b => behaviorArray.push(this.createBehaviorGroup(b), { emitEvent: false }));

                this._notificationService.notifySuccess(`Se definieron ${result.length} comportamiento(s) para el campo "${fieldData.key}" en el formulario de ${formType}.`);

                behaviorArray.markAsDirty();

                this._cdr.markForCheck();
            }
        });
    }
}