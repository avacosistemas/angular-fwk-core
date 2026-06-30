import { Component, forwardRef, inject, ChangeDetectorRef, Input, ElementRef, ViewChild, OnInit, OnChanges, SimpleChanges, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, Validator, AbstractControl, ValidationErrors, NG_VALIDATORS, FormsModule, FormControl, FormGroupDirective, NgForm, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { format, parse, isValid, getYear, getMonth, getDate, getHours, getMinutes } from 'date-fns';
import { MY_FORMATS } from '../../../services/dynamic-form/form.validator.service';
import { DynamicFieldFormComponent } from '../dynamic-field-form/dynamic-field-form.component';
import { DatepickerOptions } from '../../../model/dynamic-form/dynamic-field-options.interface';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { DatePickerModalComponent } from './datepicker-modal/datepicker-modal.component';
import { ErrorStateMatcher } from '@angular/material/core';

@Component({
    selector: 'fwk-custom-datepicker',
    templateUrl: './custom-datepicker.component.html',
    standalone: true,
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe
    ],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CustomDatePickerComponent), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => CustomDatePickerComponent), multi: true }
    ]
})
export class CustomDatePickerComponent extends DynamicFieldFormComponent<string> implements Validator, OnInit, OnChanges {

    internalControl = new FormControl('');

    matcher = new class implements ErrorStateMatcher {
        constructor(public component: CustomDatePickerComponent) { }
        isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
            return !!(this.component.errorMessage || (control?.invalid && (control?.dirty || control?.touched)));
        }
    }(this);

    onValidatorChange: () => void = () => { };

    private i18nService: I18nService;

    constructor(
        private dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        injector: Injector
    ) {
        super();
        this.i18nService = injector.get(I18nService);
    }

    ngOnInit(): void {
        this.internalControl.valueChanges.subscribe(val => {
            if (val !== this._value) {
                this._value = val;
                this.onChange(val);
                this.onTouch();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['errorMessage'] && this.errorMessage) {
            this.internalControl.setErrors({ custom: true });
            this.internalControl.markAsTouched();
        } else if (changes['errorMessage'] && !this.errorMessage) {
            this.internalControl.setErrors(null);
        }
    }

    private get datepickerOptions(): DatepickerOptions {
        return this.field?.options as DatepickerOptions;
    }

    override writeValue(value: string | null): void {
        let formattedValue = value;
        if (value) {
            const formats = this.getPossibleFormats();
            let parsed: Date | null = null;
            for (const fmt of formats) {
                const p = parse(value, fmt, new Date());
                if (isValid(p)) {
                    parsed = p;
                    break;
                }
            }
            if (parsed) {
                formattedValue = format(parsed, this.getDateFormat());
            }
        }
        this._value = formattedValue;
        this.internalControl.setValue(formattedValue, { emitEvent: false });
        this.cdr.markForCheck();
    }

    override setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        if (isDisabled) {
            this.internalControl.disable();
        } else {
            this.internalControl.enable();
        }
        this.cdr.markForCheck();
    }

    validate(control: AbstractControl): ValidationErrors | null {
        if (this.field?.required && !control.value) {
            return { required: true };
        }
        if (control.value) {
            const val = String(control.value);
            const formats = this.getPossibleFormats();
            const formatStr = this.getDateFormat();

            if (formatStr === 'HH:mm:ss' || formatStr === 'HH:mm') {
                const timeParts = val.split(':');
                if (timeParts.length >= 2) {
                    const h = parseInt(timeParts[0], 10);
                    const m = parseInt(timeParts[1], 10);
                    const s = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
                    if (h > 23 || m > 59 || s > 59) {
                        return { invalidDate: this.i18nService.translate('datepicker_invalid_hour') };
                    }
                }
            } else if (this.datepickerOptions?.withHourAndMin) {
                const parts = val.split(' ');
                if (parts.length === 2 && parts[1].includes(':')) {
                    const timeParts = parts[1].split(':');
                    if (timeParts.length >= 2) {
                        const h = parseInt(timeParts[0], 10);
                        const m = parseInt(timeParts[1], 10);
                        const s = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
                        if (h > 23 || m > 59 || s > 59) {
                            return { invalidDate: this.i18nService.translate('datepicker_invalid_hour') };
                        }
                    }
                }
            }

            let isValidDate = false;
            for (const fmt of formats) {
                const parsed = parse(val, fmt, new Date());
                if (isValid(parsed) && format(parsed, fmt) === val) {
                    isValidDate = true;
                    break;
                }
            }
            
            if (!isValidDate) {
                return { invalidDate: this.i18nService.translate('datepicker_invalid_format').replace('{format}', formats[0]) };
            }
        }
        return null;
    }

    registerOnValidatorChange(fn: () => void): void {
        this.onValidatorChange = fn;
    }

    private getDateFormat(): string {
        return this.datepickerOptions?.format ??
            (this.datepickerOptions?.withHourAndMin ? MY_FORMATS.parse.dateInputHoursSeconds : MY_FORMATS.parse.dateInput);
    }

    private getPossibleFormats(): string[] {
        const base = this.getDateFormat();
        if (base === 'HH:mm:ss' || base === 'HH:mm') {
            return ['HH:mm:ss', 'HH:mm'];
        }
        if (this.datepickerOptions?.withHourAndMin) {
            return [
                MY_FORMATS.parse.dateInputHoursSeconds,
                MY_FORMATS.parse.dateInputHours,
                MY_FORMATS.parse.dateInputIso,
                'yyyy-MM-dd HH:mm:ss',
                'dd/MM/yyyy HH:mm:ss',
                'dd/MM/yyyy HH:mm',
                'yyyy-MM-dd HH:mm'
            ];
        }
        return [base, 'yyyy-MM-dd', 'dd/MM/yyyy'];
    }

    openDateModal(): void {
        if (this.isDisabled) return;

        const now = new Date();
        let initialDate = {
            day: getDate(now), month: getMonth(now) + 1, year: getYear(now),
            hour: getHours(now), minute: getMinutes(now)
        };

        if (this._value) {
            const formats = this.getPossibleFormats();
            let parsed: Date | null = null;
            for (const fmt of formats) {
                const p = parse(this._value, fmt, now);
                if (isValid(p)) {
                    parsed = p;
                    break;
                }
            }

            if (parsed && isValid(parsed)) {
                initialDate = {
                    day: getDate(parsed), month: getMonth(parsed) + 1, year: getYear(parsed),
                    hour: getHours(parsed), minute: getMinutes(parsed)
                };
            }
        }

        const dialogRef = this.dialog.open(DatePickerModalComponent, {
            width: '420px',
            data: {
                initialDate: initialDate,
                withHourAndMin: this.datepickerOptions?.withHourAndMin || this.getDateFormat().includes(':'),
                title: this.field?.label || this.i18nService.translate('datepicker_select_date_title')
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result instanceof Date && isValid(result)) {
                const formatStr = this.getDateFormat();
                const newValue = format(result, formatStr);
                this._value = newValue;
                this.internalControl.setValue(newValue);
                this.onChange(newValue);
                this.onTouch();
                this.cdr.markForCheck();
            }
        });
    }

    remove(): void {
        if (!this.isDisabled) {
            this._value = null;
            this.internalControl.setValue(null);
            this.onChange(null);
            this.onTouch();
            this.cdr.markForCheck();
        }
    }

    onInputChange(event: any): void {
        const input = event.target as HTMLInputElement;
        let val = input.value;
        const formatStr = this.getDateFormat();
        
        if (formatStr === 'HH:mm:ss') {
            val = val.replace(/[^0-9:]/g, '');
            if (val.length === 2 && !val.includes(':')) val += ':';
            if (val.length === 5 && val.split(':').length === 2) val += ':';
            if (val.length > 8) val = val.substring(0, 8);
        } else if (formatStr === 'HH:mm') {
            val = val.replace(/[^0-9:]/g, '');
            if (val.length === 2 && !val.includes(':')) val += ':';
            if (val.length > 5) val = val.substring(0, 5);
        } else if (this.datepickerOptions?.withHourAndMin) {
            val = val.replace(/[^0-9/ :]/g, '');
            if (val.length === 2 && !val.includes('/')) val += '/';
            if (val.length === 5 && val.split('/').length === 2) val += '/';
            if (val.length === 10 && !val.includes(' ')) val += ' ';
            if (val.length === 13 && !val.includes(':')) val += ':';
            if (val.length === 16 && val.split(':').length === 2) val += ':';
            if (val.length > 19) val = val.substring(0, 19);
        } else {
            val = val.replace(/[^0-9/]/g, '');
            if (val.length === 2 && !val.includes('/')) val += '/';
            if (val.length === 5 && val.split('/').length === 2) val += '/';
            if (val.length > 10) val = val.substring(0, 10);
        }

        input.value = val;
        this._value = val;
        this.internalControl.setValue(val);
        this.onChange(val);
        this.onTouch();
        this.cdr.markForCheck();
    }

    onBlur(): void {
        this.onTouch();
        this.internalControl.markAsTouched();
        if (this._value) {
            const formats = this.getPossibleFormats();
            let parsed: Date | null = null;
            for (const fmt of formats) {
                const p = parse(this._value, fmt, new Date());
                if (isValid(p)) {
                    parsed = p;
                    break;
                }
            }
            if (parsed) {
                const formatted = format(parsed, this.getDateFormat());
                if (formatted !== this._value) {
                    this._value = formatted;
                    this.internalControl.setValue(formatted, { emitEvent: false });
                    this.onChange(formatted);
                    this.cdr.markForCheck();
                }
            }
        }
    }
}