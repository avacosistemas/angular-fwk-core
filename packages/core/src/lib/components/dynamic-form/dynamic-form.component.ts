import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, OnDestroy, Injector, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatDateFnsModule } from '@angular/material-date-fns-adapter';

import { es } from 'date-fns/locale';

import { FormService } from '../../services/dynamic-form/form.service';
import { AbstractComponent } from '../abstract-component.component';
import { FwkAlertComponent } from '../../layout/infrastructure/components/alert/alert.component';
import { DynamicField, CONTROL_TYPE } from '../../model/dynamic-form/dynamic-field';
import { DynamicFieldBehavior } from '../../model/dynamic-form/dynamic-field-behavior';


import { MY_FORMATS } from '../../services/dynamic-form/form.validator.service';
import { AutocompleteService } from '../autocomplete/autocomplete.service';
import { ApiAutocompleteConfiguration } from '../autocomplete/autocomplete.interface';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { ColorPickerConfiguration } from '../color-picker/color-picker.interface';
import { ColorPickerOptions, SelectOptions } from '../../model/dynamic-form/dynamic-field-options.interface';
import { MatIconModule } from '@angular/material/icon';
import { FileComponent } from './file/file.component';
import { DisclaimerComponent } from './disclaimer/disclaimer.component';
import { FloatComponent } from './float/float.component';
import { PickListComponent } from '../pick-list/pick-list.component';
import { SimplePickListComponent } from '../simple-pick-list/simple-pick-list.component';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { AutocompleteDesplegableComponent } from '../autocomplete-desplegable/autocomplete-desplegable.component';
import { ColorPickerComponent } from '../color-picker/color-picker.component';
import { TagsComponent } from '../tags/tags.component';
import { UrlInputComponent } from '../url-input/url-input.component';
import { A11yModule } from '@angular/cdk/a11y';
import { TextFieldModule } from '@angular/cdk/text-field';
import { IconPickerComponent } from '../icon-picker/icon-picker.component';
import { CustomDatePickerComponent } from './custom-datepicker/custom-datepicker.component';
import { HtmlEditorComponent } from '../html-editor/html-editor.component';
import { ImageCropperComponent } from './image-cropper/image-cropper.component';

@Component({
    selector: 'fwk-dynamic-form-component',
    templateUrl: './dynamic-form.component.html',
    styleUrls: ['./dynamic-form.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        A11yModule,
        TextFieldModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatChipsModule,
        MatIconModule,
        MatDateFnsModule,
        FileComponent,
        DisclaimerComponent,
        CustomDatePickerComponent,
        FloatComponent,
        PickListComponent,
        SimplePickListComponent,
        AutocompleteComponent,
        AutocompleteDesplegableComponent,
        ColorPickerComponent,
        TagsComponent,
        UrlInputComponent,
        IconPickerComponent,
        HtmlEditorComponent,
        ImageCropperComponent,
        FwkAlertComponent,
        TranslatePipe
    ],



    providers: [
        { provide: MAT_DATE_LOCALE, useValue: es },
        { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicFormComponent extends AbstractComponent implements OnInit, OnDestroy {
    @Input() fields: DynamicField<any>[] = [];
    @Input() fieldsBehavior: DynamicFieldBehavior[] = [];
    @Input() parentForm!: FormGroup;
    @Input() entity: any = {};
    @Input() isEdit: boolean = false;
    @Input() handlerFieldSourceData?: (key: string, entity: any, injector: Injector) => Observable<any>;

    @Input() subFormName: string = DynamicFormComponent.subFormName;

    @Output() onChangeEntity = new EventEmitter<any>();
    @Output() objectModified = new EventEmitter<boolean>();
    @Output() onFieldsChanges = new EventEmitter<any>();

    @ViewChild('formDirective') private formDirective?: NgForm;

    form!: FormGroup;
    firstFocusableFieldIndex: number = -1;

    public static readonly subFormName = 'subForm';

    private initStateObject: any = {};
    private formValueChangesSub?: Subscription;
    private formService: FormService;
    private autocompleteService: AutocompleteService;
    private fieldSubscriptions: Subscription[] = [];

    constructor(
        public injector: Injector,
        private cdRef: ChangeDetectorRef
    ) {
        super(injector);
        this.formService = injector.get(FormService);
        this.autocompleteService = injector.get(AutocompleteService);
    }



    override ngOnInit(): void {
        super.ngOnInit();
        this.fieldSubscriptions.push(
            this.onFieldsChanges.subscribe((data: any) => {
                if (this.fieldsBehavior && this.fieldsBehavior.length > 0 && data && this.form) {
                    this.formService.fieldsChangesBehavior(this.fields, this.fieldsBehavior, data, this.form);
                }
                this.cdRef.markForCheck();
            })
        );
        if (!this.parentForm) {
            console.error("[FWK] DynamicFormComponent requiere un [parentForm] de tipo FormGroup.");
            this.parentForm = new FormGroup({});
        }
        this.initializeForm();
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
        this.formValueChangesSub?.unsubscribe();
        this.fieldSubscriptions.forEach(s => s.unsubscribe());
        this.fieldSubscriptions = [];
        if (this.parentForm?.get(this.subFormName)) {
            this.parentForm.removeControl(this.subFormName);
        }
    }

    private initializeForm(): void {
        if (this.parentForm.get(this.subFormName)) {
            this.parentForm.removeControl(this.subFormName);
        }

        const leafFields = this.formService.flattenFields(this.fields || []);

        leafFields.forEach(field => {
            if (!field || !field.controlType) return;
            if (field.controlType === 'datetimepicker') {
                field.options = { ...field.options, withHourAndMin: true } as any;
            }
            if (field.controlType === 'timepicker') {
                field.options = { ...field.options, withHourAndMin: true, format: 'HH:mm:ss' } as any;
            }
        });

        this.form = this.formService.toFormGroupEntity(this.entity, this.fields, { disabled: !this.isEdit }, this.onFieldsChanges);
        this.parentForm.addControl(this.subFormName, this.form);

        if (this.fieldsBehavior && this.fieldsBehavior.length > 0) {
            const uniqueTriggerFields = [...new Set(this.fieldsBehavior.map(fb => fb.fieldKey))];
            const currentEntity = this.formService.injectToEntity(this.entity || {}, this.form, this.fields);
            uniqueTriggerFields.forEach(key => {
                this.formService.fieldChangeBehavior(
                    key,
                    this.fieldsBehavior,
                    currentEntity,
                    this.fields,
                    this.form
                );
            });
        }

        this.formValueChangesSub = this.form.valueChanges
            .pipe(
                debounceTime(100)
            )
            .subscribe(() => {
                this.checkObjectModified();
            });

        this.updateInitialState();

        this.loadInitialSourceData();

        const focusableControlTypes = [
            CONTROL_TYPE.Textbox, CONTROL_TYPE.Textarea, CONTROL_TYPE.Number,
            CONTROL_TYPE.Password, CONTROL_TYPE.Email, CONTROL_TYPE.Select,
            CONTROL_TYPE.Datepicker, CONTROL_TYPE.Datetimepicker, CONTROL_TYPE.Autocomplete,
            CONTROL_TYPE.AutocompleteDesplegable, CONTROL_TYPE.Float, CONTROL_TYPE.ColorPicker,
            CONTROL_TYPE.Tags, CONTROL_TYPE.UrlInput, CONTROL_TYPE.File
        ];

        this.firstFocusableFieldIndex = leafFields.findIndex(
            field => field && field.controlType && focusableControlTypes.includes(field.controlType as CONTROL_TYPE) && !field.disabled
        );

        this.cdRef.detectChanges();
    }

    private loadInitialSourceData(): void {
        const leafFields = this.formService.flattenFields(this.fields || []);
        leafFields.forEach((field) => {
            if (!field) return;
            if (field.options?.handlerSourceData && this.handlerFieldSourceData) {
                this.handlerFieldSourceData(field.key, this.entity, this.injector).subscribe(data => {
                    if (field.controlType === CONTROL_TYPE.Hidden) {
                        this.form.get(field.key)?.setValue(data);
                    } else if (field.options) {
                        (field.options as SelectOptions).fromData = data;
                    }
                    this.cdRef.markForCheck();
                });
            }
        });
    }

    public updateInitialState(): void {
        this.initStateObject = this.form.getRawValue();
        this.checkObjectModified();
    }

    public resetForm(entity: any): void {
        this.entity = entity;
        this.form.patchValue(entity);
        this.updateInitialState();
    }

    public searchTermInterface(field: ApiAutocompleteConfiguration) {
        return {
            search: (term: string) => this.autocompleteService.autocompleteSearch(this.form, field, term)
        };
    }

    getMessageErrorValidation(field: DynamicField<any>): string {
        return this.formService.getMessageErrorValidation(this.form, field);
    }

    onFormValuesChanged(): void {
        this.checkObjectModified();
    }

    private checkObjectModified(): void {
        const currentValues = this.form.getRawValue();
        const isModified = JSON.stringify(this.initStateObject) !== JSON.stringify(currentValues);
        this.objectModified.emit(isModified);
        this.cdRef.markForCheck();
    }

    getRestrictionKeys(field: DynamicField<any>): string {
        return field.options?.restrictionKeys || (field.controlType === CONTROL_TYPE.Number ? '[0-9]' : '');
    }

    getFloatLabel(field: DynamicField<any>): 'auto' | 'always' | 'never' {
        return field.options?.['floatLabel'] ?? 'auto';
    }

    onChangeSelect(event: any): void {
        // 
    }

    getOptionsWidth(options: any[]): string {
        return (!options || options.length === 0) ? '100%' : `${Math.floor(100 / options.length) - 3}%`;
    }

    public getColorPickerConfig(field: DynamicField<any>): ColorPickerConfiguration {
        return {
            key: field.key,
            label: field.label,
            required: field.required,
            disabled: field.disabled,
            value: field.value,
            options: field.options as ColorPickerOptions
        };
    }
}