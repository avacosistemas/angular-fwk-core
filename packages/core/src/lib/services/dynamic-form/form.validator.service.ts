import { Injectable } from '@angular/core';
import { AbstractControl, FormControl, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';
import { I18nService } from '../i18n-service/i18n.service';
import { I18n } from '../../model/i18n';
import { DynamicField, EMAIL, HIDDEN, DATEPICKER } from '../../model/dynamic-form/dynamic-field';
import { CONSTANTS } from '../../utils/constants';

import { parse, isValid, differenceInYears } from 'date-fns';
import { DatepickerOptions } from '../../model/dynamic-form/dynamic-field-options.interface';

export const MY_FORMATS = {
  parse: { 
    dateInput: 'dd/MM/yyyy', 
    dateInputHours: 'dd/MM/yyyy HH:mm',
    dateInputHoursSeconds: 'dd/MM/yyyy HH:mm:ss',
    dateInputIso: 'yyyy-MM-dd HH:mm:ss'
  },
  display: { dateInput: 'dd/MM/yyyy', monthYearLabel: 'MMM yyyy', dateA11yLabel: 'PP', monthYearA11yLabel: 'MMMM yyyy' },
};

export interface ValidationDef {
  key: string;
  input?: any;
  message?: string;
  messageKey?: string;
}

export const REGEX_KEY_SPACES_AND_ESPECIAL_LETTERS_NUMBERS_SLASH_DOT = 'spacesAndSpecialLettersNumbersSlashDot';
export const REGEX_KEY_SPACES_AND_ESPECIAL_LETTERS = 'spacesAndSpecialLetters';
export const REGEX_KEY_LETTERS_NUMBERS = 'lettersNumbers';
export const REGEX_KEY_CODIGO_POSTAL = 'codigoPostal';
export const REGEX_KEY_ALIAS_CBU = 'aliasCBU';
export const REGEX_KEY_CUIT = 'cuit';
export const REGEX_KEY_CUIL = 'cuil';
export const REGEX_KEY_USER = 'user';
export const REGEX_VALIDATION = 'regex';
export const OPTION_VALIDATION = 'optionRequired';
export const EQUALS_VALIDATION = 'equals';
export const GT_18_YEARS_OLD_VALIDATION = 'gt18YearsOld';
export const REGEX_KEY_EMAIL = 'email';
export const REGEX_KEY_URL = 'url';
export const REGEX_KEY_NO_WHITE_SPACES = 'whitespace';


function formatString(str: string, ...args: any[]): string {
  if (!str) return '';
  return str.replace(/{(\d+)}/g, (match, number) => {
    return typeof args[number] !== 'undefined' ? args[number] : match;
  });
}

@Injectable({
  providedIn: 'root'
})
export class FormValidatorService {
  private i18n?: I18n;

  constructor(private i18nService: I18nService) {
    this.setupTranslations();
  }

  private setupTranslations(): void {
    this.i18nService.addI18n({
      name: 'form-validator',
      lang: 'es',
      words: {
        required_error_message: 'El campo {0} es requerido',
        min_length_error_message: 'El campo {0} debe tener una longitud mínima de {1} caracter/es',
        max_length_error_message: 'El campo {0} debe tener una longitud máxima de {1} caracter/es',
        length_error_message: 'El campo {0} debe tener una longitud de {1} caracter/es',
        min_error_message: 'El campo {0} debe ser de un valor mínimo de {1} ',
        max_error_message: 'El campo {0} debe ser de un valor máximo de {1} ',
        email_format_error_message: 'El campo {0} no tiene un formato válido',
        whitespace_format_error_message: 'El campo {0} no puede iniciar con espacios.',
        user_error_message: 'El campo {0} solo permite letras, números, guion bajo y medio',
        spaces_and_especial_characters_error_message: 'El campo {0} solo permite letras y espacios',
        spaces_and_especial_letters_numbers_slash_dot_error_message: 'El campo {0} solo se permite letras, números, guion medio y punto',
        letter_numbers_dash_undercode_with_first_letter_message: 'El campo {0} debe comenzar con una letra y solo se permite letras, números, guion medio y bajo',
        only_numbers_message: 'El campo {0} solo permite números',
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
        generic_error_message: 'El campo {0} es invalido',
        gt_18_years_old_error_message: 'Debe ser mayor de 18 años para registrarse',
        date_hour_message: 'Debe ingresar una fecha y hora valida ej: 20/08/2018 17:00',
        url_protocol_error_message: 'El campo {0} debe comenzar con http:// o https://',
        url_incomplete_error_message: 'La URL en el campo {0} está incompleta o mal formada',
        url_format_error_message: 'El campo {0} no tiene un formato válido',
        autocomplete_select_or_clean_error: 'Debe seleccionar un elemento de la lista o limpiar el campo',
      }
    });
    this.i18nService.getByName('form-validator').subscribe(i18n => { this.i18n = i18n; });
  }

  private translate(key: string, ...args: any[]): string {
    const template = this.i18n?.translate?.(key) ?? key;
    return formatString(template, ...args);
  }

  getMessageErrorValidation(form: AbstractControl, field: DynamicField<any>): string {
    const control = form.get(field.key);
    if (!control || !control.errors) return '';
    const errorKeys = Object.keys(control.errors);
    for (const key of errorKeys) {
      if (ERROR_MESSAGE_GENERATORS[key]) {
        return ERROR_MESSAGE_GENERATORS[key](this, field, control.errors[key]);
      }
    }
    console.warn(`Mensaje de error no definido para el error:`, control.errors);
    return this.translate('error_message_not_set');
  }

  public getValidators(field: DynamicField<any>): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (field.required && field.controlType !== HIDDEN) {
      validators.push(Validators.required);
    }
    if (field.controlType === EMAIL) {
      validators.push(Validators.email);
    }
    if (field.maxLength) {
      validators.push(Validators.maxLength(field.maxLength));
    }
    if (field.minLength) {
      validators.push(Validators.minLength(field.minLength));
    }
    if (field.minValue !== undefined) {
      validators.push(Validators.min(field.minValue));
    }
    if (field.maxValue !== undefined) {
      validators.push(Validators.max(field.maxValue));
    }
    if (field.length !== undefined) {
      validators.push(CUSTOMS_VALIDATORS_HELPER.length(field.length, field.required ?? false));
    }
    if (field.controlType === DATEPICKER) {
      validators.push(CUSTOMS_VALIDATORS_HELPER.date((field.options as DatepickerOptions)?.format));
    }
    if (field.validations) {
      field.validations.forEach((validation: ValidationDef) => {
        const validatorFnBuilder = VALIDATIONS_HELPER[validation.key];
        if (validatorFnBuilder) {
          const validator = validation.input ? validatorFnBuilder(validation.input, validation.message) : validatorFnBuilder();
          validators.push(validator as ValidatorFn);
        } else {
          console.warn(`Clave de validación '${validation.key}' no encontrada.`);
        }
      });
    }
    return validators;
  }
}

export const ERROR_MESSAGES_HELPER: { [key: string]: (service: FormValidatorService, field: DynamicField<any>) => string } = {
  [GT_18_YEARS_OLD_VALIDATION]: (service, field) => {
    return service['translate']('gt_18_years_old_error_message');
  }
};

const ERROR_MESSAGE_GENERATORS: { [key: string]: (service: FormValidatorService, field: DynamicField<any>, error: any) => string } = {
  'required': (service, field) => {
    const nameField = (field.label ?? field.key).toLowerCase();
    if (field['requiredMessage']) return field['requiredMessage'];
    if (field.controlType === DATEPICKER) {
      const format = (field.options as DatepickerOptions)?.format || MY_FORMATS.parse.dateInput;
      return service['translate']('date_error_required_or_invalidmessage', nameField, format);
    }
    return service['translate']('required_error_message', nameField);
  },
  'maxlength': (service, field, error) => service['translate']('max_length_error_message', (field.label ?? field.key).toLowerCase(), error.requiredLength),
  'minlength': (service, field, error) => service['translate']('min_length_error_message', (field.label ?? field.key).toLowerCase(), error.requiredLength),
  'length': (service, field) => {
    const nameField = (field.label ?? field.key).toLowerCase();
    const msgKey = field.lengthErrorMsgKey || 'length_error_message';
    return service['translate'](msgKey, nameField, field.length);
  },
  'min': (service, field, error) => service['translate']('min_error_message', (field.label ?? field.key).toLowerCase(), error.min),
  'max': (service, field, error) => service['translate']('max_error_message', (field.label ?? field.key).toLowerCase(), error.max),
  'email': (service, field) => service['translate']('email_format_error_message', (field.label ?? field.key).toLowerCase()),
  'whitespace': (service, field) => service['translate']('whitespace_format_error_message', (field.label ?? field.key).toLowerCase()),
  'pattern': (service, field) => {
    const nameField = (field.label ?? field.key).toLowerCase();
    const key = field.validation?.regexKey;
    const customMessage = field.validation?.errorMessage;
    if (customMessage) return formatString(customMessage, nameField);

    const messageKey = CONSTANTS.REGEXS.find(r => r.key === key)?.messageKey;
    if (messageKey) {
      return service['translate'](messageKey, nameField);
    }
    return service['translate']('generic_error_message', nameField);
  },
  'date': (service, field) => service['translate']('datepattern_error_message', (field.label ?? field.key).toLowerCase(), (field.options as DatepickerOptions)?.format || MY_FORMATS.display.dateInput),
  'matDatepickerParse': (service, field) => service['translate']('datepattern_error_message', (field.label ?? field.key).toLowerCase(), (field.options as DatepickerOptions)?.format || MY_FORMATS.display.dateInput),
  'customError': (_, __, error) => error.errorMessage,
  'regexError': (_, __, error) => error.errorMessage,
  'invalidProtocol': (service, field) => {
    return service['translate']('url_protocol_error_message', (field.label ?? field.key).toLowerCase());
  },
  'invalidUrlFormat': (service, field) => {
    return service['translate']('url_incomplete_error_message', (field.label ?? field.key).toLowerCase());
  },
  'invalidValue': (service, field) => {
    if (field.options && (field.options as any).invalidValueMessage) {
      return (field.options as any).invalidValueMessage;
    }
    return service['translate']('generic_error_message', (field.label ?? field.key).toLowerCase());
  },
  'invalidDate': (service, __, error) => typeof error === 'string' ? error : service['translate']('form_error_invalid_date'),
  'selectOrCleanField': (service, field) => {
    if (field.options && (field.options as any).selectElementOrCleanField) {
      return (field.options as any).selectElementOrCleanField;
    }
    return service['translate']('autocomplete_select_or_clean_error');
  },
  ...ERROR_MESSAGES_HELPER
};

export const CUSTOMS_VALIDATORS_HELPER = {
  optionRequired(): ValidatorFn { return (control: AbstractControl): { [key: string]: any } | null => !control.value ? { 'required': { requiredMessage: '' } } : null; },
  equals(input: string, errorMessage: string): ValidatorFn { return (control: AbstractControl): { [key: string]: any } | null => control.value === input ? null : { 'customError': { errorMessage: errorMessage } }; },
  date(patternDate: string = MY_FORMATS.parse.dateInput): ValidatorFn { return (control: AbstractControl): { [key: string]: any } | null => { if (!control.value || typeof control.value !== 'string') return null; const parsedDate = parse(control.value, patternDate, new Date()); return isValid(parsedDate) ? null : { 'date': true }; }; },
  gt18YearsOld(patternDate: string = MY_FORMATS.parse.dateInput): ValidatorFn { return (control: AbstractControl): { [key: string]: any } | null => { if (!control.value || typeof control.value !== 'string') return null; const parsedDate = parse(control.value, patternDate, new Date()); if (!isValid(parsedDate)) return null; return differenceInYears(new Date(), parsedDate) >= 18 ? null : { [GT_18_YEARS_OLD_VALIDATION]: true }; }; },
  regex(regex: string, errorMessage: string): ValidatorFn { return (control: AbstractControl): { [key: string]: any } | null => { if (!control.value) return null; const error = new RegExp(regex).test(control.value); return error ? null : { 'regexError': { errorMessage: errorMessage } }; }; },
  noWhitespaceValidator(): ValidatorFn { return (control: AbstractControl): { [key: string]: any } | null => { const isWhitespace = typeof control.value === 'string' && control.value.trim().length === 0; return isWhitespace && control.value.length > 0 ? { 'whitespace': true } : null; }; },
  length(length: number, required: boolean): ValidatorFn { return (control: AbstractControl): { [key: string]: any } | null => { const value = control.value; if (value === null || value === undefined) return null; const valueStr = String(value); if (valueStr.length === 0 && !required) return null; return valueStr.length !== length ? { 'length': true } : null; }; }
};

export const VALIDATIONS_HELPER: { [key: string]: (...args: any[]) => ValidatorFn | ((control: AbstractControl) => ValidationErrors | null) } = {
  [OPTION_VALIDATION]: CUSTOMS_VALIDATORS_HELPER.optionRequired,
  [REGEX_VALIDATION]: Validators.pattern,
  [EQUALS_VALIDATION]: CUSTOMS_VALIDATORS_HELPER.equals,
  [GT_18_YEARS_OLD_VALIDATION]: CUSTOMS_VALIDATORS_HELPER.gt18YearsOld,
  [REGEX_KEY_SPACES_AND_ESPECIAL_LETTERS]: () => Validators.pattern(CONSTANTS.REGEX_SPACES_AND_SPECIAL_LETTERS),
  [REGEX_KEY_ALIAS_CBU]: () => Validators.pattern(CONSTANTS.REGEX_ALIAS_CBU),
  [REGEX_KEY_USER]: () => Validators.pattern(CONSTANTS.REGEX_USER),
  [REGEX_KEY_SPACES_AND_ESPECIAL_LETTERS_NUMBERS_SLASH_DOT]: () => Validators.pattern(CONSTANTS.REGEX_SPACES_AND_SPECIAL_LETTERS_NUMBERS_SLASH_DOT),
  [REGEX_KEY_LETTERS_NUMBERS]: () => Validators.pattern(CONSTANTS.REGEX_LETTERS_NUMBERS),
  [REGEX_KEY_CODIGO_POSTAL]: () => Validators.pattern(CONSTANTS.REGEX_CODIGO_POSTAL),
  [REGEX_KEY_CUIT]: () => Validators.pattern(CONSTANTS.REGEX_CUIT),
  [REGEX_KEY_CUIL]: () => Validators.pattern(CONSTANTS.REGEX_CUIL),
  [REGEX_KEY_EMAIL]: () => Validators.email,
  [REGEX_KEY_URL]: () => Validators.pattern(CONSTANTS.REGEX_URL),
  [REGEX_KEY_NO_WHITE_SPACES]: CUSTOMS_VALIDATORS_HELPER.noWhitespaceValidator,
};

export class CustomValidator {
  static urlValidator(control: AbstractControl): { [key: string]: boolean } | null { if (!control.value) return null; const URL_REGEX = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i; return URL_REGEX.test(control.value) ? null : { invalidUrl: true }; }
  static matchPassword(group: AbstractControl): { [key: string]: boolean } | null { const password = group.get('password'); const confirm = group.get('confirm'); if (!password || !confirm) return null; return password.value === confirm.value ? null : { invalidPassword: true }; }
  static numberValidator(control: AbstractControl): { [key: string]: boolean } | null { if (!control.value) return null; const NUMBER_REGEXP = /^-?[\d.]+(?:e-?\d+)?$/; return NUMBER_REGEXP.test(control.value) ? null : { invalidNumber: true }; }
  static noWhitespaceValidator(control: FormControl): { [key: string]: boolean } | null { const isWhitespace = (control.value || '').trim().length === 0; return isWhitespace && control.value.length > 0 ? { 'whitespace': true } : null; }
}