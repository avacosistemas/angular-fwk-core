import { Inject, Injectable } from '@angular/core';
import { FormControl, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { Observable, Subject, asyncScheduler } from 'rxjs';
import { debounceTime, distinctUntilChanged, throttleTime, share, tap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

import { DynamicField, CONTROL_TYPE, HIDDEN } from '../../model/dynamic-form/dynamic-field';
import { DynamicFieldBehavior } from '../../model/dynamic-form/dynamic-field-behavior';
import { DynamicFieldConditionIf } from '../../model/dynamic-form/dynamic-field-condition-if';
import { WsDef, HTTP_METHODS } from '../../model/ws-def';
import { GridDef } from '../../model/component-def/grid-def';
import { ColumnDef } from '../../model/component-def/grid-def';
import { ActionDef } from '../../model/component-def/action-def';
import { FormDef } from '../../model/form-def';
import { I18n } from '../../model/i18n';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';

import { I18nService } from '../i18n-service/i18n.service';
import { FormValidatorService, MY_FORMATS, ValidationDef } from './form.validator.service';
import { GenericHttpService } from '../generic-http-service/generic-http.service';
import { FilterService, FILTER_TYPE } from '../filter-service/filter.service';

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AutocompleteOptions, DatepickerOptions, DisclaimerOptions, FloatOptions, PickListOptions, SelectOptions } from '../../model/dynamic-form/dynamic-field-options.interface';

export interface FieldControlApi {
  field: DynamicField<any>;
  isHide(): boolean;
  hide(): void;
  setLabel(label: string): void;
  setValue(value: any): void;
  setValues(observable: Observable<any[]>): void;
  changeToRequired(): void;
  changeToAutoComplete(): void;
  changeToAutoCompleteDesplegable(): void;
  changeFieldToSelect(): void;
  changeFieldToNumber(): void;
  changeFieldToTextbox(): void;
  changeFieldToDatepicker(): void;
  changeRegexKey(regexKey: string): void;
  changeRemoveRegex(): void;
  changeMaxLength(length: number): void;
  changeMinLength(length: number): void;
  changeLength(length: number): void;
  updateByDef(def: any): void;
}

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private _showModalRequest = new Subject<any>();
  public showModalRequest = this._showModalRequest.pipe(
    throttleTime(2000, asyncScheduler, { leading: true, trailing: false }),
    share()
  );

  editorTemplates: any[] = [];
  i18n?: I18n;

  constructor(
    @Inject(FWK_CONFIG) private _fwkConfig: FwkConfig,
    private i18nService: I18nService,
    private filterService: FilterService,
    public formValidatorService: FormValidatorService,
    private genericHttpService: GenericHttpService,
    private activatedRoute: ActivatedRoute
  ) {
    this.setupTranslations();
  }

  private setupTranslations(): void {
    this.i18nService.addI18n({
      name: 'form',
      lang: 'es',
      words: {
        required_error_message: 'El campo {0} es requerido',
        min_length_error_message: 'El campo {0} debe tener una longitud mínima de {1} caracter/es',
        max_length_error_message: 'El campo {0} debe tener una longitud máxima de {1} caracter/es',
        length_error_message: 'El campo {0} debe tener una longitud de {1} caracter/es',
        min_error_message: 'El campo {0} debe ser de un valor mínimo de {1}',
        max_error_message: 'El campo {0} debe ser de un valor máximo de {1}',
        email_format_error_message: 'El campo {0} no tiene un formato válido',
        user_error_message: 'El campo {0} solo permite letras, números, guion bajo y medio',
        spaces_and_especial_characters_error_message: 'El campo {0} solo permite letras y espacios',
        spaces_and_especial_letters_numbers_slash_dot_error_message: 'El campo {0} solo se permite letras, números, guion medio y punto',
        letter_numbers_dash_undercode_with_first_letter_message: 'El campo {0} debe comenzar con una letra y solo se permite letras, números, guion medio y bajo',
        letters_numbers_error_message: 'El campo {0} solo permite números y letras',
        datepattern_error_message: 'El campo {0} debe tener un formato: {1}',
        date_error_required_or_invalidmessage: 'El campo {0} es requerido y debe tener un formato: {1}',
        cuil_error_message: 'El campo {0} debe comenzar con 20, 23, 24 o 27.',
        cuit_error_message: 'El campo {0} debe comenzar con 20, 23, 24, 27, 30, 33 o 34',
        alias_cbu_error_message: 'El campo {0} debe ser alfanumerico incluyendo guión medio y punto. No incluye la letra Ñ',
        codigo_postal_error_message: 'El campo {0} debe ser de 4 dígitos (1234) o 1 letra, 4 dígitos y 3 letras al final (A1324CDE)',
        phone_error_message: 'El campo {0} debe contener exactamente {1} dígitos sin incluir el 0 de código de área. (Ej: 1148001234)',
        cellphone_error_message: 'El campo {0} debe contener exactamente {1} dígitos incluyendo el 15 después del código de área sin 0. (Ej: 111560001234)',
        error_message_not_set: 'Error desconocido',
        generic_error_message: 'El campo {0} es invalido'
      }
    });
    this.i18nService.getByName('form').subscribe(i18n => { this.i18n = i18n; });
  }

  private translate(key?: string): string {
    if (!key) return '';
    return this.i18nService.translate(key);
  }

  setUpGridFromI18n(i18n: I18n, gridDef: GridDef): void {
    if (!gridDef) return;
    if (gridDef.titleKey) {
      gridDef.title = this.translate(gridDef.titleKey);
    }
    gridDef.columnsDef?.forEach((column: ColumnDef) => {
      if (column.columnNameKey) {
        column.columnName = this.translate(column.columnNameKey);
      }
    });
    this.setUpActionsFromI18n(i18n, gridDef.actions);
  }

  setUpActionsFromI18n(i18n: I18n, actions?: ActionDef[]): void {
    actions?.forEach(action => {
      if (action.actionNameKey) action.actionName = this.translate(action.actionNameKey);
      if (action.titleKey) {
        const translatedTitle = this.translate(action.titleKey);
        if (action.formDef) {
          action.formDef.title = translatedTitle;
        }
      }
      if (action.actionType === 'notification') {
        if (action.input.messageKey) action.input.message = this.translate(action.input.messageKey);
        if (action.input.modalNameKey) action.input.modalName = this.translate(action.input.modalNameKey);
      }
      if (action.form) this.setUpFieldTextFromI18n(i18n, action.form);

      if (action.formDef) this.setUpFormDef(i18n, action.formDef);

      if (action.gridModal) this.setUpGridFromI18n(i18n, action.gridModal.gridDef);
      if (action.confirm && typeof action.confirm === 'object' && action.confirm.messageKey) {
        action.confirm.message = this.translate(action.confirm.messageKey);
      }
    });
  }

  setUpFormDef(i18n: I18n, formDef?: FormDef): void {
    if (!formDef) return;
    if (formDef.titleKey) formDef.title = this.translate(formDef.titleKey);
    if (formDef.fields) this.setUpFieldTextFromI18n(i18n, formDef.fields);
    this.setUpActionsFromI18n(i18n, formDef.actions);
  }


  setUpkeysi18nOfGrid(i18n: I18n, gridDef: GridDef): void {
    if (gridDef) this.setUpGridFromI18n(i18n, gridDef);
  }

  setUpDialogsFromI18n(i18n: I18n, dialogs: any): void {
    if (dialogs.read) {
      if (dialogs.read.modalNameKey) dialogs.read.modalName = this.translate(dialogs.read.modalNameKey);
      dialogs.read.grids.forEach((grid: GridDef) => this.setUpGridFromI18n(i18n, grid));
      if (dialogs.read.form.fields) this.setUpFieldTextFromI18n(i18n, dialogs.read.form.fields);
      if (dialogs.read.actions) this.setUpActionsFromI18n(i18n, dialogs.read.actions);
    }
  }

  setUpFieldTextFromI18n(i18n: I18n, fields: DynamicField<any>[]): void {
    if (!fields) return;
    fields.forEach(element => {

      if (element.labelKey) {
        element.label = i18n.translate?.(element.labelKey) ?? element.labelKey;
      }

      if (element.validation) {
        if (element.validation.errorMessageKey) {
          element.validation.errorMessage = i18n.translate?.(element.validation.errorMessageKey);
        }
        if (element.validation.regexKey) {
          const regex = i18n.translate?.(element.validation.regexKey);
          if (regex !== element.validation.regexKey) {
            element.validation.regex = regex;
          }
        }
      }
      if (element.validations) {
        element.validations.forEach((validation: ValidationDef) => {
          if (validation.messageKey) {
            validation.message = i18n.translate?.(validation.messageKey);
          }
        });
      }
      this.setUpPickListTextFromI18n(i18n, element);
      this.setUpDisclaimerTextFromI18n(i18n, element);
    });
  }

  setUpDisclaimerTextFromI18n(i18n: I18n, element: DynamicField<any>): void {
    const options = element.options as DisclaimerOptions;
    if (element.controlType === CONTROL_TYPE.Disclaimer && options?.disclaimer?.labelKey) {
      options.disclaimer.label = this.translate(options.disclaimer.labelKey);
    }
  }

  private setUpPickListTextFromI18n(i18n: I18n, element: DynamicField<any>): void {
    if ([CONTROL_TYPE.Picklist, CONTROL_TYPE.SimplePicklist].includes(element.controlType as CONTROL_TYPE) && element.options) {
      const options = element.options as PickListOptions;
      if (options.titleFromKey) options.titleFrom = this.translate(options.titleFromKey);
      if (options.titleToKey) options.titleTo = this.translate(options.titleToKey);
    }
  }

  getMessageErrorValidation(form: AbstractControl, field: DynamicField<any>): string {
    return this.formValidatorService.getMessageErrorValidation(form, field);
  }

  toFormGroupEntity(entity: any, fields: DynamicField<any>[], options: any, onFieldsChanges: any): FormGroup {
    fields.forEach(field => {
      if (entity) {
        if (entity[field.key] !== undefined) {
          field.value = entity[field.key];
        } else if (field.value !== undefined) {
          entity[field.key] = field.value;
        }
      }
    });
    return this.toFormGroup(fields, options, onFieldsChanges);
  }

  toFormGroup(fields: DynamicField<any>[], options: any, onFieldsChanges: any): FormGroup {
    return this.getGroupControls(fields, options, onFieldsChanges);
  }

  getGroupControls(fields: DynamicField<any>[], options: any, onFieldsChanges: any): FormGroup {
    const params = this.activatedRoute.snapshot.queryParams;
    const form = new FormGroup({});
    const validFields = fields.filter(field => this.filterAndPrepareField(field, params));
    validFields.forEach(field => {
      const control = this.createFormControlForField(field, options);
      form.addControl(field.key, control);
      this.setUpWsDef(field, form, validFields, onFieldsChanges);
      if (onFieldsChanges) {
        this.subscribeToFieldChanges(form, field, validFields, onFieldsChanges);
      }
    });
    if (onFieldsChanges) {
      onFieldsChanges.emit({ entity: this.injectToEntity({}, form, validFields), fields: validFields });
    }
    return form;
  }

  private filterAndPrepareField(field: DynamicField<any>, params: any): boolean {
    if (!this.implementedField(field)) {
      console.warn(`El tipo de campo -> '${field.controlType}' no se encuentra implementado.`);
      return false;
    }
    if (field.mappingQuerystring && params[field.key]) {
      field.value = params[field.key];
    }
    if (!field.options) field.options = {};
    if ([CONTROL_TYPE.Autocomplete, CONTROL_TYPE.AutocompleteDesplegable].includes(field.controlType as CONTROL_TYPE) && !(field.options as AutocompleteOptions).fromData) {
      (field.options as AutocompleteOptions).fromData = [];
    }
    if (field.controlType === CONTROL_TYPE.Checkbox && field.value == null) {
      field.value = false;
    }
    if (field.value && typeof field.value === 'string') {
      if (field.controlType === CONTROL_TYPE.DateRead) {
        field.value = format(parseISO(field.value), 'P', { locale: es });
      }
      if (field.controlType === CONTROL_TYPE.DateTimeRead) {
        field.value = format(parseISO(field.value), 'P p', { locale: es });
      }
    }
    return true;
  }

  private createFormControlForField(field: DynamicField<any>, options: any): FormControl {
    const formState = {
      value: field.value ?? null,
      disabled: field.disabled ?? options?.disabled ?? false
    };
    const validators = this.formValidatorService.getValidators(field);
    return new FormControl(formState, validators);
  }

  private subscribeToFieldChanges(form: FormGroup, field: DynamicField<any>, allFields: DynamicField<any>[], onFieldsChanges: any): void {
    const control = form.get(field.key);
    if (!control) return;

    control.valueChanges.pipe(
      debounceTime(100),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      const data = {
        fieldKey: field.key,
        entity: this.injectToEntity({}, form, allFields),
        fields: allFields
      };
      onFieldsChanges.emit(data);
    });
  }

  applyParamsToFilter(params: any, field: DynamicField<any>): void {
    if (field.mappingQuerystring && params[field.key]) {
      field.value = params[field.key];
    }
  }

  private setUpWsDef(field: DynamicField<any>, form: FormGroup, allFields?: DynamicField<any>[], onFieldsChanges?: any): void {
    const fromWs: WsDef | undefined = field.options?.fromWs;
    if (!fromWs || ![CONTROL_TYPE.Select, CONTROL_TYPE.Autocomplete, CONTROL_TYPE.AutocompleteDesplegable, CONTROL_TYPE.Picklist, CONTROL_TYPE.SimplePicklist].includes(field.controlType as CONTROL_TYPE)) return;

    const url = new URL(fromWs.url.startsWith('http') ? fromWs.url : `${this._fwkConfig.apiBaseUrl!}${fromWs.url}`);
    const qs = fromWs.querystring;
    if (qs) {
      Object.keys(qs).forEach(key => {
        const formKey = qs[key];
        const control = form.get(formKey);
        if (control?.value) {
          url.searchParams.append(key, control.value);
        }
      });
    }
    const wsToCall: WsDef = { ...fromWs, url: url.toString(), method: HTTP_METHODS.get };
    this.genericHttpService.callWs(wsToCall).subscribe(r => {
      if (field.options) (field.options as SelectOptions).fromData = r;
      const control = form.get(field.key);
      if (control) {
        control.patchValue(control.value);
      }
      if (onFieldsChanges && allFields) {
        onFieldsChanges.emit({ fieldKey: field.key, entity: this.injectToEntity({}, form, allFields), fields: allFields });
      }
    });
  }

  public implementedField(field: DynamicField<any>): boolean {
    const controlTypes = Object.values(CONTROL_TYPE) as string[];
    return controlTypes.includes(field.controlType.toLowerCase());
  }

  resetFormWithFields(form: FormGroup, fields: DynamicField<any>[], options: any, onFieldsChanges: any): void {
    form.reset(this.getGroupControls(fields, options, onFieldsChanges));
  }

  toFormError(fields: DynamicField<any>[]): any {
    const group: any = {};
    fields.forEach(field => { group[field.key] = {}; });
    return group;
  }

  patchField(fieldKey: string, value: any, form: FormGroup): void {
    this.patchFields(form, { [fieldKey]: value });
  }

  patchFields(form: FormGroup, fields: any): void {
    Object.keys(fields).forEach(key => {
      const control = form.get(key);
      if (control) {
        control.patchValue(fields[key]);
      }
    });
  }

  addErrorToFields(form: FormGroup, errorsFields: any): void {
    Object.keys(errorsFields).forEach(key => {
      const control = form.controls[key];
      if (control) {
        control.setErrors({ 'customError': { errorMessage: errorsFields[key] } });
        control.markAsTouched();
      }
    });
  }

  getFieldControl(keyField: string, form: FormGroup, fields: DynamicField<any>[]): FieldControlApi | null {
    const field = fields.find(f => f.key === keyField);
    if (!field) return null;
    return {
      field: field,
      isHide: () => field.controlType === HIDDEN,
      hide: () => this.hideField(form, field),
      setLabel: (label: string) => { field.label = label; },
      setValue: (value: any) => this.setValueField(form, field, value),
      setValues: (observable: Observable<any[]>) => this.setValues(observable, field),
      changeToRequired: () => this.changeToRequired(form, field),
      changeToAutoComplete: () => this.changeFieldToAutocomplete(form, field),
      changeToAutoCompleteDesplegable: () => this.changeFieldToAutocompleteDesplegable(form, field),
      changeFieldToSelect: () => this.changeFieldToSelect(form, field),
      changeFieldToNumber: () => this.changeFieldToNumber(form, field),
      changeFieldToTextbox: () => this.changeFieldToTextbox(form, field),
      changeFieldToDatepicker: () => this.changeFieldToDatepicker(form, field),
      changeRegexKey: (regexKey: string) => this.changeRegexKey(form, field, regexKey),
      changeRemoveRegex: () => this.changeRemoveRegex(form, field),
      changeMaxLength: (length: number) => this.changeMaxLength(form, field, length),
      changeMinLength: (length: number) => this.changeMinLength(form, field, length),
      changeLength: (length: number) => this.changeLength(form, field, length),
      updateByDef: (def: any) => this.updateByDef(form, field, def),
    };
  }

  getEntityFromFields(fields: DynamicField<any>[]): any {
    const entity: any = {};
    fields.forEach(element => {
      if (this.implementedField(element)) {
        entity[element.key] = element.value;
        if (element.controlType === CONTROL_TYPE.Checkbox && (entity[element.key] == null)) {
          entity[element.key] = false;
        }
        if (element.controlType === CONTROL_TYPE.Number && (entity[element.key] != null && entity[element.key] !== '')) {
          entity[element.key] = Number(entity[element.key]);
        }
        if (element.id && entity.id === undefined) {
          entity.id = element.value;
        }
      }
    });
    return entity;
  }

  injectToEntity(entity: any, form: FormGroup, fields: DynamicField<any>[]): any {

    const cleanedEntity: any = {};

    fields.forEach(element => {
      const control = form.controls[element.key];
      if (this.implementedField(element) && control) {
        const value = control.value;

        cleanedEntity[element.key] = value;

        if (element.controlType === CONTROL_TYPE.Checkbox && value == null) {
          cleanedEntity[element.key] = false;
        }

        if (element.controlType === CONTROL_TYPE.Float && element.options && typeof value === 'string') {
          const options = element.options as FloatOptions;
          const delim = options.delim ?? ',';
          const outputDelim = options.outputFormatDelim ?? '.';
          cleanedEntity[element.key] = value.replace(delim, outputDelim);
        }

        if (element.controlType === CONTROL_TYPE.Number && (value != null && value !== '')) {
          cleanedEntity[element.key] = Number(value);
        }

        if (element.id && cleanedEntity.id === undefined) {
          cleanedEntity.id = value;
        }
      }
    });

    return cleanedEntity;
  }

  updateFieldsByField(fields: DynamicField<any>[], field: DynamicField<any>): DynamicField<any>[] {
    return fields.map(element => element.key === field.key ? field : element);
  }

  updateFormByField(form: FormGroup, field: DynamicField<any>): void {
    if (form.controls[field.key]) { }
  }

  fieldsChangesBehavior(fields: DynamicField<any>[], fieldsBehavior: DynamicFieldBehavior[], data: any, form: FormGroup): void {
    if (!fields || !fieldsBehavior || !form || !data) return;
    const entity = data.entity;
    const fieldsToChange = data.fieldKey ? [data.fieldKey] : fields.map(f => f.key);
    fieldsToChange.forEach((fieldKey: string) => this.fieldChangeBehavior(fieldKey, fieldsBehavior, entity, fields, form));
  }

  fieldChangeBehavior(fieldKey: string, fieldsBehavior: DynamicFieldBehavior[], entity: any, fields: DynamicField<any>[], form: FormGroup): void {
    fieldsBehavior
      .filter(fb => fb.fieldKey === fieldKey)
      .forEach(fieldBehavior => {
        let result = fieldBehavior.condition.if?.every(el => this.evalCondition(el, fields, entity)) ?? true;
        const fieldsToUpdate = result ? fieldBehavior.condition.then : fieldBehavior.condition.else;
        fieldsToUpdate?.forEach(fieldDef => {
          const fieldDefToUpdate = JSON.parse(JSON.stringify(fieldDef));
          const triggerValue = entity[fieldKey];

          if (fieldDefToUpdate.value === '{{value}}') {
            fieldDefToUpdate.value = triggerValue;
          } else if (typeof fieldDefToUpdate.value === 'object' && fieldDefToUpdate.value !== null) {
            Object.keys(fieldDefToUpdate.value).forEach(k => {
              if (fieldDefToUpdate.value[k] === '{{value}}') {
                fieldDefToUpdate.value[k] = triggerValue;
              }
            });
          }

          const fieldControl = this.getFieldControl(fieldDefToUpdate.key, form, fields);
          fieldControl?.updateByDef(fieldDefToUpdate);
          if (fieldDef.showErrorMsg) {
            this.addErrorToFields(form, { [fieldDef.key]: this.translate(fieldDef.showErrorMsg) });
          }
            if ((fieldDef as any).showModal) {
              const modalData = (fieldDef as any).showModal;
              const message = typeof modalData === 'string' ? this.translate(modalData) : this.translate(modalData.message);
              this._showModalRequest.next({
                title: typeof modalData === 'object' && modalData.title ? this.translate(modalData.title) : this.translate('modal_default_title'),
                message: message,
              onSubmit: () => { },
              actions: {
                confirm: {
                  label: typeof modalData === 'object' && modalData.buttonLabel ? modalData.buttonLabel : this.translate('modal_got_it_button')
                },
                cancel: { show: false }
              }
            });
          }

          if ((fieldDef as any).validationWs && (fieldDef as any).validationWs.url) {
            const validationDef = (fieldDef as any).validationWs;
            const control = form.get(fieldDef.key);
            let value = control?.value;
            if (value && validationDef.valueProperty) {
              value = value[validationDef.valueProperty];
            }
            if (value) {
              this.genericHttpService.basicGet(validationDef.url, { valueToValidate: value }, null, { [validationDef.param]: 'valueToValidate' }).subscribe(res => {
                let isValid = res === true || res?.valid === true || res?.data === true;
                if (res && typeof res === 'object') {
                  if (res.status === 'OK' && res.data !== undefined) {
                    isValid = res.data === true || res.data === 'true';
                  } else if (res.success !== undefined) {
                    isValid = res.success === true;
                  }
                }

                if (!isValid) {
                  const errorMsg = validationDef.errorMessageKey ? this.translate(validationDef.errorMessageKey) : this.translate(validationDef.errorMessage);
                  this.addErrorToFields(form, { [fieldDef.key]: errorMsg || this.translate('validation_failed_default_message') });

                  if (validationDef.showModalOnFail) {
                    this._showModalRequest.next({
                      title: this.translate('modal_default_title'),
                      message: errorMsg || this.translate('validation_failed_default_message'),
                      onSubmit: () => { },
                      actions: {
                        confirm: { label: this.translate('modal_got_it_button') },
                        cancel: { show: false }
                      }
                    });
                  }
                }
                if (validationDef.assignResultToField) {
                  const targetControl = form.get(validationDef.assignResultToField);
                  if (targetControl) {
                    targetControl.setValue(isValid, { emitEvent: true });
                  }
                }
              });
            }
          }
        });
      });
  }

  setEditorTemplates(): Observable<any[]> {
    return this.genericHttpService.basicGet(this._fwkConfig.apiBaseUrl! + 'TemplateContent', null, null, {}).pipe(
      tap(r => this.editorTemplates = r)
    );
  }

  private evalCondition(condition: DynamicFieldConditionIf, fields: DynamicField<any>[], entity: any): boolean {
    if (condition.key === undefined) return true;
    const compare = (condition.compare ?? FILTER_TYPE.EQUALS) as FILTER_TYPE;
    const field = fields.find(f => f.key === condition.key);
    if (condition.toField) {
      const entityValue = entity[condition.toField];
      const conditionValue = condition.value ?? entity[condition.key];
      if ((conditionValue == null || conditionValue === "") && condition.avoidThenOnValueNull) {
        return false;
      }
      return this.filterService.filter(entityValue, conditionValue, compare, field);
    } else {
      return this.filterService.filter(entity[condition.key], condition.value, compare, field);
    }
  }

  private setValues(observable: Observable<any[]>, field: DynamicField<any>): void {
    observable.subscribe(d => {
      if (!field.options) field.options = {};
      (field.options as SelectOptions).fromData = d;
    });
  }

  private hideField(form: FormGroup, field: DynamicField<any>): void {
    if (field.controlType !== HIDDEN) {
      this.setUndefinedField(form, field);
      field.controlType = HIDDEN;
      this.changeToUnRequired(form, field);
      this.disable(form, field);
    }
  }

  private changeToRequired(form: FormGroup, field: DynamicField<any>): void {
    if (!field.required) {
      field.required = true;
      this.updateValidators(form, field);
    }
  }

  private changeMaxLength(form: FormGroup, field: DynamicField<any>, length: number): void {
    if (field.maxLength !== length) {
      field.maxLength = length;
      this.updateValidators(form, field);
    }
  }

  private changeMinLength(form: FormGroup, field: DynamicField<any>, length: number): void {
    if (field.minLength !== length) {
      field.minLength = length;
      this.updateValidators(form, field);
    }
  }

  private changeRemoveLengths(form: FormGroup, field: DynamicField<any>): void {
    if (field.length || field.minLength || field.maxLength) {
      field.length = undefined;
      field.minLength = undefined;
      field.maxLength = undefined;
      this.updateValidators(form, field);
    }
  }

  private updateByDef(form: FormGroup, field: DynamicField<any>, def: Partial<DynamicField<any>>): void {
    let needsUpdate = false;
    const previousControlType = field.controlType;

    Object.keys(def).forEach(keyString => {
      const key = keyString as keyof DynamicField<any>;
      if (field[key] !== def[key]) {
        (field as any)[key] = def[key];
        needsUpdate = true;
      }
    });

    if (def.controlType) {
      if (def.controlType === HIDDEN && previousControlType !== HIDDEN) {
        this.hideField(form, field);
      } else if (def.controlType !== HIDDEN && previousControlType === HIDDEN) {
        this.enabled(form, field);

        if (field.required) {
          this.changeToRequired(form, field);
        }
      }
    }

    if (def.value !== undefined) this.setValueField(form, field, def.value);
    if (def.disabled !== undefined) {
      def.disabled ? this.disable(form, field) : this.enabled(form, field);
    }

    if (needsUpdate) this.updateValidators(form, field);
  }


  private changeLength(form: FormGroup, field: DynamicField<any>, length: number): void {
    if (field.length !== length) {
      field.length = length;
      this.updateValidators(form, field);
    }
  }

  private updateValidators(form: FormGroup, field: DynamicField<any>): void {
    const control = form.get(field.key);
    if (control) {
      control.setValidators(this.formValidatorService.getValidators(field));
      control.updateValueAndValidity();
    }
  }

  private changeRemoveRegex(form: FormGroup, field: DynamicField<any>): void {
    if (field.validation) {
      field.validation = undefined;
      this.updateValidators(form, field);
    }
  }

  private changeRegexKey(form: FormGroup, field: DynamicField<any>, regexKey: string): void {
    if (!field.validation) field.validation = {};
    if (field.validation.regexKey !== regexKey) {
      field.validation.regexKey = regexKey;
      this.updateValidators(form, field);
    }
  }

  private changeToUnRequired(form: FormGroup, field: DynamicField<any>): void {
    if (field.required) {
      field.required = false;
      this.updateValidators(form, field);
    }
  }

  private changeFieldControlType(form: FormGroup, field: DynamicField<any>, newType: (typeof CONTROL_TYPE)[keyof typeof CONTROL_TYPE]): void {
    if (field.controlType !== newType) {
      this.enabled(form, field);
      this.setUndefinedField(form, field);
      field.controlType = newType;
      form.get(field.key)?.reset();
    }
  }

  private changeFieldToAutocomplete(form: FormGroup, field: DynamicField<any>): void { this.changeFieldControlType(form, field, CONTROL_TYPE.Autocomplete); }
  private changeFieldToAutocompleteDesplegable(form: FormGroup, field: DynamicField<any>): void { this.changeFieldControlType(form, field, CONTROL_TYPE.AutocompleteDesplegable); }
  private changeFieldToSelect(form: FormGroup, field: DynamicField<any>): void { this.changeFieldControlType(form, field, CONTROL_TYPE.Select); }
  private changeFieldToNumber(form: FormGroup, field: DynamicField<any>): void { this.changeFieldControlType(form, field, CONTROL_TYPE.Number); }
  private changeFieldToTextbox(form: FormGroup, field: DynamicField<any>): void { this.changeFieldControlType(form, field, CONTROL_TYPE.Textbox); }
  private changeFieldToDatepicker(form: FormGroup, field: DynamicField<any>): void { this.changeFieldControlType(form, field, CONTROL_TYPE.Datepicker); }

  setUpBehaviorTextFromI18n(i18n: I18n, fieldBehavior: DynamicFieldBehavior[]): void {
    const translateMessages = (list: any[]) => {
      list.forEach(item => {
        if (item.showErrorMsgKey) {
          item.showErrorMsg = this.translate(item.showErrorMsgKey);
        }
      });
    };
    fieldBehavior?.forEach(f => {
      if (f.condition) {
        if (f.condition.then) translateMessages(f.condition.then);
        if (f.condition.else) translateMessages(f.condition.else);
      }
    });
  }

  setUndefinedField(form: FormGroup, field: DynamicField<any>): void {
    this.setValueField(form, field, undefined);
  }

  setValueField(form: FormGroup, field: DynamicField<any>, value: any): void {
    const control = form.get(field.key);
    if (control && control.value !== value) {
      field.value = value;
      (control as FormControl).patchValue(value);
    }
  }

  getField(fieldKey: string, fields: DynamicField<any>[]): DynamicField<any> | undefined {
    return fields.find(f => f.key === fieldKey);
  }

  private disable(form: FormGroup, field: DynamicField<any>): void {
    form.get(field.key)?.disable();
  }

  private enabled(form: FormGroup, field: DynamicField<any>): void {
    form.get(field.key)?.enable();
  }
}