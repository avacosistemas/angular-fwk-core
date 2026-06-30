import { Component, OnInit, forwardRef, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors, FormsModule, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ErrorStateMatcher } from '@angular/material/core';
import { DynamicFieldFormComponent } from '../dynamic-field-form/dynamic-field-form.component';
import { RestrictionKeysDirective } from '../../../directive/restriction-keys.directive';
import { FloatOptions } from '../../../model/dynamic-form/dynamic-field-options.interface';

@Component({
   selector: 'fwk-float',
  templateUrl: './float.component.html',
  styleUrls: ['./float.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    RestrictionKeysDirective
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FloatComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => FloatComponent),
      multi: true
    }
  ]
})
export class FloatComponent extends DynamicFieldFormComponent<string> implements Validator, OnInit {

  @Input() errorMessage: string | null = null; 

  matcher = new class implements ErrorStateMatcher {
    constructor(public component: FloatComponent) { }
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
      return !!(this.component.errorMessage || (control?.invalid && (control?.dirty || control?.touched)));
    }
  }(this);

  private decimalMaxLength: number = 2;
  private delim: string = ',';
  onValidatorChange: () => void = () => { };

  private get floatOptions(): FloatOptions {
    return this.field?.options as FloatOptions;
  }

  constructor(private cdr: ChangeDetectorRef) {
      super();
  }

  ngOnInit(): void {
    const options = this.floatOptions;
    if (options) {
      this.delim = options.delim ?? ',';
      this.decimalMaxLength = options.decimalMaxLength ?? 2;
    }
  }

  override writeValue(value: string | null): void {
    this._value = value;
    this.cdr.markForCheck();
  }

  override setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.cdr.markForCheck();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (this.field?.required && !value) {
      return { required: true };
    }

    if (value && typeof value === 'string') {
      const parts = value.split(this.delim);
      if (value.includes(this.delim)) {
        if (parts.length > 2 || parts.some(p => p.length === 0)) {
          return { floatFormat: `El formato decimal es incorrecto.` };
        }
        const decimalPart = parts[1];
        if (decimalPart.length > this.decimalMaxLength) {
          return { floatDecimalLength: `Debe contener un m�ximo de ${this.decimalMaxLength} decimales.` };
        }
      }
    }
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.onValueChange(value);
  }

  onValueChange(newValue: string): void {
    const valueToEmit = newValue || null;
    if (this._value !== valueToEmit) {
      this._value = valueToEmit;
      this.onChange(valueToEmit);
    }
  }

  onBlur(): void {
    this.onTouch();
  }
}