import { Component, ChangeDetectionStrategy, OnInit, inject, ChangeDetectorRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Observable, startWith, map, finalize, takeUntil, Subject } from 'rxjs';
import { DevToolsService } from '../../services/dev-tools.service';
import { NotificationService } from '../../../../services/notification/notification.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IconPickerComponent } from '../../../../components/icon-picker/icon-picker.component';
import { DevToolsStateService } from '../../services/dev-tools-state.service';
import { TranslatePipe } from '../../../../pipe/translate.pipe';
import { BehaviorDefinitionModalComponent } from '../behavior-definition-modal/behavior-definition-modal.component';
import { DynamicField } from '../../../../model/dynamic-form/dynamic-field';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BasicModalComponent } from '../../../../components/crud/basic-modal/basic-modal.component';
import { FieldDefinitionModalComponent } from '../field-definition-modal/field-definition-modal.component';
import { NAVIGATION_GROUPS_MAP } from 'app/core/navigation/navigation.groups';
import { FwkMediaWatcherService } from '../../../../layout/infrastructure/services/media-watcher';
import { toConstCase } from '../../dev-tools.utils';

interface FieldTableRow {
    key: string;
    control: FormGroup;
}

@Component({
    selector: 'fwk-crud-generator',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatStepperModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatAutocompleteModule, MatProgressSpinnerModule, MatSelectModule, MatCheckboxModule, MatTableModule, MatSlideToggleModule, MatTooltipModule, UpperCasePipe, IconPickerComponent, TranslatePipe],
    templateUrl: './crud-generator.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CrudGeneratorComponent implements OnInit, OnDestroy {
    @ViewChild('stepper') stepper: MatStepper;

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _notificationService = inject(NotificationService);
    private _dialog = inject(MatDialog);
    private _cdr = inject(ChangeDetectorRef);
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private _devToolsStateService = inject(DevToolsStateService);
    private _fwkMediaWatcherService = inject(FwkMediaWatcherService);

    isScreenSmall$: Observable<boolean> = this._fwkMediaWatcherService.onMediaChange$
        .pipe(map(({ matchingAliases }) => !matchingAliases.includes('md')));

    step1Form: FormGroup;
    step2Form: FormGroup;
    step3Form: FormGroup;
    step4Form: FormGroup;
    step5Form: FormGroup;
    step6Form: FormGroup;

    fieldsDataSource = new MatTableDataSource<FieldTableRow>();
    displayedFieldsColumns: string[] = ['key', 'label', 'controlType', 'flags', 'options'];

    private fieldsBehavior = {
        filter: new Map<number, any[]>(),
        create: new Map<number, any[]>(),
        update: new Map<number, any[]>()
    };

    endpoints: { path: string, summary: string }[] = [];
    filteredEndpoints$: Observable<{ path: string, summary: string }[]>;

    isScanning = false;
    scanError: string | null = null;
    isGenerating = false;

    private actionFormDefs = new Map<number, DynamicField<any>[]>();

    paginationSettings: any = {};
    navigationGroups = [...NAVIGATION_GROUPS_MAP];

    controlTypeChoices = ['textbox', 'number', 'textarea', 'email', 'password', 'datepicker', 'datetimepicker', 'checkbox', 'select', 'autocomplete', 'hidden', 'color_picker', 'tags', 'pick-list', 'simple-pick-list', 'file', 'url_input', 'icon-picker', 'disclaimer', 'float'];
    actionTypeChoices = ['redirect', 'form_modal', 'grid_modal', 'file_download', 'file_preview'];
    httpMethods = ['POST', 'PUT', 'DELETE', 'GET'];
    behaviorComparators = ['EQUALS', 'NOTEQUALS', 'GREATER', 'LESS', 'GREATER_EQUALS', 'LESS_EQUALS', 'HAS_VALUE', 'LIKE'];

    autoReadAccess: string;
    autoCreateAccess: string;
    autoUpdateAccess: string;
    autoDeleteAccess: string;

    get fields(): FormArray { return this.step4Form.get('fields') as FormArray; }
    get actions(): FormArray { return this.step5Form.get('actions') as FormArray; }

    get generatedFormsSummary(): string {
        const forms = [];
        if (this.step2Form.value.useCreate) { forms.push('Crear'); }
        if (this.step2Form.value.useUpdate) { forms.push('Editar'); }
        if (this.step2Form.value.useRead) { forms.push('Leer'); }
        return forms.length > 0 ? forms.join(', ') : 'Ninguno';
    }

    ngOnInit(): void {
        this.step1Form = this._fb.group({ endpoint: ['', Validators.required] });
        this.step2Form = this._fb.group({
            name: ['', [Validators.required, Validators.pattern(/^[A-Z][a-zA-Z0-9]*$/)]],
            pluralName: ['', Validators.required],
            navGroup: ['ventas', Validators.required],
            navIcon: [''],
            showInMenu: [true],
            useCreate: [true],
            useUpdate: [true],
            useRead: [false],
        });
        this.step3Form = this._fb.group({
            customize: [false],
            readAccess: [''],
            updateAccess: [''],
            createAccess: [''],
            deleteAccess: ['']
        });
        this.step4Form = this._fb.group({ fields: this._fb.array([]) });
        this.step5Form = this._fb.group({
            deleteAction: [true],
            groupActions: [true],
            actions: this._fb.array([])
        });
        this.step6Form = this._fb.group({
            serverPagination: [true],
            filterInMemory: [false],
            cancelInitSearch: [false],
            pageSize: [10, [Validators.required, Validators.min(1)]],
            dialogWidth: ['600px'],
            actionCellClass: [''],
            exportCsv: ['none']
        });

        this.step2Form.get('name')!.valueChanges.pipe(
            startWith(this.step2Form.get('name')!.value),
            takeUntil(this._unsubscribeAll)
        ).subscribe(name => {
            const constName = (name || 'CRUD').replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');
            this.autoReadAccess = `${constName}_READ`;
            this.autoCreateAccess = `${constName}_CREATE`;
            this.autoUpdateAccess = `${constName}_UPDATE`;
            this.autoDeleteAccess = `${constName}_DELETE`;
            this._cdr.markForCheck();
        });

        this._devToolsService.getSwaggerEndpoints().subscribe({
            next: endpoints => {
                this.endpoints = endpoints;
                this.filteredEndpoints$ = this.step1Form.get('endpoint')!.valueChanges.pipe(
                    startWith(''), map(value => this._filterEndpoints(value || ''))
                );
                this._cdr.markForCheck();
            },
            error: err => this._notificationService.notifyError(err.error?.message || 'No se pudo cargar la lista de endpoints del Swagger.')
        });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    private _filterEndpoints = (value: string) => this.endpoints.filter(o => o.path.toLowerCase().includes(value.toLowerCase()) || o.summary.toLowerCase().includes(value.toLowerCase()));

    scanEndpoint(): void {
        if (this.step1Form.invalid) return;
        this.isScanning = true;
        this.scanError = null;
        this.fields.clear();
        this._cdr.markForCheck();
        const endpoint = this.step1Form.value.endpoint;
        this._devToolsService.scanEndpoint(endpoint).pipe(finalize(() => { this.isScanning = false; this._cdr.markForCheck(); }))
            .subscribe({
                next: (data) => {
                    if (!data || !Array.isArray(data.fields)) { this.scanError = 'La respuesta del servidor de desarrollo no es válida.'; return; }
                    const newDataSourceData: FieldTableRow[] = [];
                    data.fields.forEach((fieldData: any) => {
                        const fieldGroup = this.createFieldGroup(fieldData);
                        this.fields.push(fieldGroup);
                        newDataSourceData.push({ key: fieldData.key, control: fieldGroup });
                    });
                    this.fieldsDataSource.data = newDataSourceData;
                    this.paginationSettings = data.paginationSettings;
                    this.step6Form.patchValue(this.paginationSettings);
                    const name = endpoint.split('/').pop()?.replace(/-/g, '') || '';
                    const pascal = name.charAt(0).toUpperCase() + name.slice(1);
                    this.step2Form.patchValue({ name: pascal, pluralName: `${pascal}s` });
                    this._notificationService.notifySuccess(`Endpoint escaneado. Se encontraron ${data.fields.length} campos.`);
                    this._cdr.markForCheck();
                    this.stepper.next();
                },
                error: (err) => { this.scanError = err.error?.message || 'Ocurrió un error al escanear.'; }
            });
    }

    createFieldGroup(field: any): FormGroup {
        const fg = this._fb.group({
            key: [field.key],
            label: [field.label, Validators.required],
            controlType: [field.controlType, Validators.required],
            required: [false],
            inGrid: [field.key.toLowerCase() !== 'id'],
            inFilter: [field.key.toLowerCase() !== 'id'],
            isBaseFilter: [false],
            mappingQuerystring: [false],
            columnType: ['text'],
            headerClass: [''],
            cellClass: [''],
            validations: this._fb.group({
                minLength: [null], maxLength: [null], min: [null], max: [null], pattern: [null]
            }),
            options: this._fb.group({
                 dataSourceType: ['none'],
                fromData: [''],
                fromWsUrl: [''], 
                elementLabel: [''],
                elementValue: [''],
                titleFrom: [''],
                titleTo: ['']   
            })
        });
        const inFilterControl = fg.get('inFilter');
        const isBaseFilterControl = fg.get('isBaseFilter');
        if (!inFilterControl?.value) { isBaseFilterControl?.disable({ emitEvent: false }); }
        inFilterControl?.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(val => {
            val ? isBaseFilterControl?.enable({ emitEvent: false }) : isBaseFilterControl?.disable({ emitEvent: false });
            if (!val) { isBaseFilterControl?.setValue(false, { emitEvent: false }); }
        });
        return fg;
    }

    private unflattenObject(data: any): any {
        if (Object.prototype.toString.call(data) !== '[object Object]') {
            return data;
        }
        const result: any = {};
        for (const key in data) {
            const keys = key.split('.');
            keys.reduce((acc, part, index) => {
                if (index === keys.length - 1) {
                    acc[part] = data[key];
                } else {
                    const nextIsNumber = !isNaN(parseInt(keys[index + 1], 10));
                    if (!acc[part]) {
                        acc[part] = nextIsNumber ? [] : {};
                    }
                }
                return acc[part];
            }, result);
        }
        return result;
    }

    openFieldOptions(fieldRow: FieldTableRow): void {
        const rawValue = fieldRow.control.getRawValue();
        const entityForModal = {
            ...rawValue,
            key: fieldRow.key, 
            'options.dataSourceType': rawValue.options?.dataSourceType,
            'options.fromData': rawValue.options?.fromData,
            'options.fromWsUrl': rawValue.options?.fromWsUrl,
            'options.elementLabel': rawValue.options?.elementLabel,
            'options.elementValue': rawValue.options?.elementValue,
            'validations.pattern': rawValue.validations?.pattern
        };

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

            { key: 'complex_validations_header', controlType: 'header', label: 'Validaciones Complejas' },
            {
                key: 'validations.pattern', label: 'Regex Key (ej: REGEX_KEY_ONLY_NUMBERS)', controlType: 'textbox', cssClass: 'sm:col-span-2',
                labelKey: 'Este valor se guardará como { key: "pattern", input: ... }'
            },

            { key: 'messages_header', controlType: 'header', label: 'Mensajes de Error' },
            { key: 'requiredMessage', label: 'Mensaje "Requerido"', controlType: 'textbox' },
            { key: 'minLengthMessage', label: 'Mensaje "Largo Mínimo"', controlType: 'textbox' },
            { key: 'maxLengthMessage', label: 'Mensaje "Largo Máximo"', controlType: 'textbox' },
            
            { key: 'options_header', controlType: 'header', label: 'Fuente de Datos (Select/PickList)' },
            { 
                key: 'options.dataSourceType', 
                label: 'Tipo de Fuente', 
                controlType: 'select', 
                options: { 
                    fromData: [
                        { value: 'none', label: 'Ninguna' }, 
                        { value: 'static', label: 'Estática (JSON)' }, 
                        { value: 'api', label: 'API (Web Service)' }
                    ], 
                    elementLabel: 'label', 
                    elementValue: 'value' 
                } 
            },
            { key: 'options.fromData', label: 'Lista Estática (JSON)', controlType: 'textarea' },
            { key: 'options.fromWsUrl', label: 'URL de API (sin prefijo)', controlType: 'textbox' },
            { key: 'options.elementLabel', label: 'Campo Etiqueta (ej: nombre)', controlType: 'textbox' },
            { key: 'options.elementValue', label: 'Campo Valor (ej: id)', controlType: 'textbox' },
            
            { key: 'grid_header', controlType: 'header', label: 'Opciones de Grilla' },
            { key: 'columnType', label: 'Tipo de Columna', controlType: 'select', options: { fromData: ['text', 'date', 'datehour', 'boolean'].map(v => ({ value: v, label: v })), elementLabel: 'label', elementValue: 'value' } },
            { key: 'headerClass', label: 'Clase CSS Header', controlType: 'textbox' },
            { key: 'cellClass', label: 'Clase CSS Celda', controlType: 'textbox' },
        ];

        this._dialog.open(BasicModalComponent, {
            width: '800px',
            data: {
                entity: entityForModal,
                config: {
                    modalKey: 'dev-tools-field-options',
                    titleKey: `Opciones para '${fieldRow.key}'`,
                    form: formFields,
                    submitButtonKey: 'Guardar'
                },
                submit: {
                    onSubmitModal: (resultEntity: any, modal: MatDialogRef<any>) => {
                        console.log('Datos recibidos del modal:', resultEntity);

                        const patchData: any = {
                            ...resultEntity,
                            options: {
                                dataSourceType: resultEntity['options.dataSourceType'],
                                fromData: resultEntity['options.fromData'],
                                fromWsUrl: resultEntity['options.fromWsUrl'],
                                elementLabel: resultEntity['options.elementLabel'],
                                elementValue: resultEntity['options.elementValue']
                            },
                            validations: {
                                pattern: resultEntity['validations.pattern']
                            }
                        };

                        delete patchData['options.dataSourceType'];
                        delete patchData['options.fromData'];
                        delete patchData['options.fromWsUrl'];
                        delete patchData['options.elementLabel'];
                        delete patchData['options.elementValue'];
                        delete patchData['options.titleFrom'];
                        delete patchData['options.titleTo'];
                        delete patchData['validations.pattern'];
                        
                        fieldRow.control.patchValue(patchData);
                        this._cdr.markForCheck();
                        modal.close(true);
                    }
                }
            }
        });
    }

    addAction(): void {
        const actionGroup = this._fb.group({
            name: ['', Validators.required],
            icon: [''],
            type: ['redirect', Validators.required],
            security: [null],
            requiresConfirm: [false],
            confirmMessage: [''],
            showSubmitContinue: [false],
            querystring: this._fb.array([]),
            ws: this._fb.group({
                endpoint: [''],
                method: ['POST'],
                isRelative: [true]
            }),
            redirect: this._fb.group({
                endpoint: [''],
                openTab: [false]
            }),
            displayCondition: this._fb.group({
                expression: this._fb.group({
                    key: [null],
                    value: [''],
                    compare: ['EQUALS']
                })
            })
        });

        this.actions.push(actionGroup);
    }

    removeAction(index: number): void {
        this.actions.removeAt(index);
        this.actionFormDefs.delete(index);
    }

    getQuerystringArray(actionIndex: number): FormArray {
        return this.actions.at(actionIndex).get('querystring') as FormArray;
    }

    createQuerystringGroup(): FormGroup {
        return this._fb.group({
            paramKey: ['', Validators.required],
            paramValue: ['', Validators.required]
        });
    }

    addQuerystringParam(actionIndex: number): void {
        this.getQuerystringArray(actionIndex).push(this.createQuerystringGroup());
    }

    removeQuerystringParam(actionIndex: number, paramIndex: number): void {
        this.getQuerystringArray(actionIndex).removeAt(paramIndex);
    }

    defineActionForm(actionIndex: number): void {
        const actionControl = this.actions.at(actionIndex);

        const dialogRef = this._dialog.open(FieldDefinitionModalComponent, {
            width: '90vw',
            maxWidth: '1200px',
            data: {
                fields: this.actionFormDefs.get(actionIndex) || [],
                allAvailableFields: this.fieldsDataSource.data.map(f => ({ key: f.key, label: f.control.value.label })),
                actionName: actionControl.value.name
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && Array.isArray(result)) {
                this.actionFormDefs.set(actionIndex, result);
                this._notificationService.notifySuccess(`Formulario para "${actionControl.value.name}" definido con ${result.length} campos.`);
                this._cdr.markForCheck();
            }
        });
    }

    getActionFormDefCount(index: number): number {
        return this.actionFormDefs.get(index)?.length || 0;
    }

    generate(): void {
        if ([this.step1Form, this.step2Form, this.step3Form, this.step4Form, this.step5Form, this.step6Form].some(f => f.invalid)) {
            this._notificationService.notifyError('Por favor, completa todos los campos requeridos en todos los pasos.');
            return;
        }
        this.isGenerating = true;
        this._cdr.markForCheck();
        
        const finalFields = this.fieldsDataSource.data.map(row => ({
            key: row.key,
            ...row.control.getRawValue()
        }));

        const constName = toConstCase(this.step2Form.value.name);

        const finalActions = this.actions.getRawValue().map((action, index) => {
            const actionKey = `${constName}_grid_action_${action.name.toLowerCase().replace(/[\s-]/g, '_')}`;
            
            const baseAction: any = {
                actionNameKey: actionKey,
                actionNameValue: action.name,
                icon: action.icon || undefined,
                actionType: action.type,
                actionSecurity: action.security || null,
            };

            if (action.requiresConfirm) {
                baseAction.confirm = { message: action.confirmMessage || `¿Está seguro de que desea ejecutar la acción: ${action.name}?` };
            }

            if (action.type === 'form_modal') {
                if (this.actionFormDefs.has(index)) {
                    baseAction.formDef = {
                        fields: this.actionFormDefs.get(index),
                        showSubmitContinue: action.showSubmitContinue
                    };
                }
                if (action.ws?.endpoint) {
                    baseAction.ws = {
                        key: `${actionKey}_ws`,
                        method: action.ws.method || 'POST',
                        url: action.ws.isRelative ? `%%PREFIX_DOMAIN_API + '${action.ws.endpoint}'%%` : action.ws.endpoint,
                    };
                }
            } else if (action.type === 'redirect') {
                baseAction.redirect = {
                    url: action.redirect.endpoint,
                    openTab: action.redirect.openTab
                };
            } else if (action.ws?.endpoint) {
                baseAction.ws = {
                    key: `${actionKey}_ws`,
                    method: action.ws.method || 'POST',
                    url: action.ws.isRelative ? `%%PREFIX_DOMAIN_API + '${action.ws.endpoint}'%%` : action.ws.endpoint
                };
            }
            
            const querystringObject = (action.querystring || []).reduce((acc, curr) => {
                if (curr.paramKey && curr.paramValue) {
                    acc[curr.paramKey] = curr.paramValue;
                }
                return acc;
            }, {});

            if (Object.keys(querystringObject).length > 0) {
                if (baseAction.redirect) baseAction.redirect.querystring = querystringObject;
                if (baseAction.ws) baseAction.ws.querystring = querystringObject;
            }

            if (action.displayCondition?.expression?.key) {
                baseAction.displayCondition = action.displayCondition;
            }

            return baseAction;
        });

        const finalBehaviors = {
            filter: Array.from(this.fieldsBehavior.filter.values()).flat(),
            create: Array.from(this.fieldsBehavior.create.values()).flat(),
            update: Array.from(this.fieldsBehavior.update.values()).flat(),
        };

        const finalConfig = {
            ...this.step2Form.value,
            apiEndpoint: this.step1Form.value.endpoint,
            fields: finalFields,
            fieldsBehavior: finalBehaviors,
            security: this.step3Form.value,
            actionsConfig: { ...this.step5Form.getRawValue(), actions: finalActions },
            advancedConfig: this.step6Form.getRawValue(),
        };

        this._devToolsService.generateCrud(finalConfig).pipe(
            finalize(() => {
                if (this.isGenerating) { this.isGenerating = false; this._cdr.markForCheck(); }
            })
        ).subscribe({
            next: res => { 
                this._devToolsStateService.show(res.message || 'CRUD generado exitosamente.'); 
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            },
            error: err => this._notificationService.notifyError(err.error?.message || 'Error al generar el CRUD.')
        });
    }
    
    getFieldCount(predicate: (row: FieldTableRow) => boolean): number {
        if (!this.fieldsDataSource?.data) return 0;
        return this.fieldsDataSource.data.filter(predicate).length;
    }

    getFieldList(predicate: (row: FieldTableRow) => boolean): string {
        if (!this.fieldsDataSource?.data) return 'Ninguno';
        const sel = this.fieldsDataSource.data.filter(predicate).map(row => row.key);
        return sel.length > 0 ? sel.join(', ') : 'Ninguno';
    }

    get gridFieldCount(): number { return this.getFieldCount(row => row.control.get('inGrid')?.value); }
    get gridFieldList(): string { return this.getFieldList(row => row.control.get('inGrid')?.value); }
    get filterFieldCount(): number { return this.getFieldCount(row => row.control.get('inFilter')?.value); }
    get filterFieldList(): string { return this.getFieldList(row => row.control.get('inFilter')?.value); }
    get baseFilterFieldCount(): number { return this.getFieldCount(row => row.control.get('isBaseFilter')?.value); }
    get baseFilterFieldList(): string { return this.getFieldList(row => row.control.get('isBaseFilter')?.value); }
    get createFieldCount(): number { return this.getFieldCount(row => row.key.toLowerCase() !== 'id'); }
    get updateFieldCount(): number { return this.fieldsDataSource.data.length; }
    get readFieldCount(): number { return this.fieldsDataSource.data.length; }

    get customActionsSummary(): string {
        if (this.actions.controls.length === 0) { return 'Ninguna'; }
        return '<ul>' + this.actions.controls.map(action => {
            const name = action.get('name')?.value || 'Sin nombre';
            const type = action.get('type')?.value;
            const condition = action.get('displayCondition.expression');
            let conditionStr = '';
            if (condition?.get('key')?.value) {
                const value = condition.get('value').value;
                const valueStr = typeof value === 'boolean' || typeof value === 'number' ? value : `'${value}'`;
                conditionStr = ` (Mostrar SI ${condition.get('key').value} ${condition.get('compare').value} ${valueStr})`;
            }
            return `<li><b>${name}</b> (Tipo: ${type})${conditionStr}</li>`;
        }).join('') + '</ul>';
    }

    get behaviorsSummary(): string {
        let summary = [];
        const createBehaviors = Array.from(this.fieldsBehavior.create.values()).flat();
        const updateBehaviors = Array.from(this.fieldsBehavior.update.values()).flat();
        const filterBehaviors = Array.from(this.fieldsBehavior.filter.values()).flat();

        if (createBehaviors.length > 0) summary.push(`<b>Formulario de Alta:</b> ${createBehaviors.length} regla(s)`);
        if (updateBehaviors.length > 0) summary.push(`<b>Formulario de Edición:</b> ${updateBehaviors.length} regla(s)`);
        if (filterBehaviors.length > 0) summary.push(`<b>Formulario de Filtro:</b> ${filterBehaviors.length} regla(s)`);

        return summary.length > 0 ? summary.join('<br>') : 'Ninguno';
    }

    getNavGroupName = () => this.navigationGroups.find(g => g.id === this.step2Form.value.navGroup)?.title || 'N/A';

    hasBehavior(fieldIndex: number): boolean {
        return (this.fieldsBehavior.create.get(fieldIndex)?.length > 0) ||
            (this.fieldsBehavior.update.get(fieldIndex)?.length > 0) ||
            (this.fieldsBehavior.filter.get(fieldIndex)?.length > 0);
    }

    openFieldBehaviors(fieldRow: FieldTableRow, fieldIndex: number): void {
        const availableForms: { label: string, value: 'create' | 'update' | 'filter' }[] = [];
        if (this.step2Form.get('useCreate').value) availableForms.push({ label: 'Alta (Create)', value: 'create' });
        if (this.step2Form.get('useUpdate').value) availableForms.push({ label: 'Edición (Update)', value: 'update' });
        if (this.fieldsDataSource.data.some(f => f.control.get('inFilter').value)) availableForms.push({ label: 'Filtro (Filter)', value: 'filter' });

        if (availableForms.length === 0) {
            this._notificationService.notifyError('No hay formularios activos para asociar un comportamiento.');
            return;
        }

        const formSelectionField: DynamicField<any> = {
            key: 'formType',
            label: 'Selecciona el formulario para definir el comportamiento',
            controlType: 'select',
            required: true,
            options: { fromData: availableForms, elementLabel: 'label', elementValue: 'value' }
        };

        this._dialog.open(BasicModalComponent, {
            width: '400px',
            data: {
                config: {
                    titleKey: `Comportamiento para "${fieldRow.key}"`,
                    form: [formSelectionField],
                    submitButtonKey: 'Continuar'
                },
                submit: {
                    onSubmitModal: (entity: any, modal: MatDialogRef<any>) => {
                        modal.close(entity.formType);
                    }
                }
            }
        }).afterClosed().subscribe(formType => {
            if (!formType) return;

            const behaviorMap = this.fieldsBehavior[formType] as Map<number, any[]>;

            const dialogRef = this._dialog.open(BehaviorDefinitionModalComponent, {
                width: '90vw',
                maxWidth: '1200px',
                data: {
                    behaviors: behaviorMap.get(fieldIndex) || [],
                    availableFields: this.fieldsDataSource.data.map(f => ({ key: f.key, label: f.control.value.label })),
                    triggerFieldKey: fieldRow.key
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result && Array.isArray(result)) {
                    behaviorMap.set(fieldIndex, result);
                    this._notificationService.notifySuccess(`Se definieron ${result.length} comportamiento(s) para el campo "${fieldRow.key}" en el formulario de ${formType}.`);
                    this._cdr.markForCheck();
                }
            });
        });
    }
}