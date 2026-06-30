import { Component, forwardRef, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NG_VALUE_ACCESSOR, Validator, AbstractControl, ValidationErrors, NG_VALIDATORS, FormsModule, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UrlInputConfiguration } from './url-input.interface';
import { DynamicFieldFormComponent } from '../dynamic-form/dynamic-field-form/dynamic-field-form.component';
import { TranslatePipe } from '../../pipe/translate.pipe';

@Component({
  selector: 'fwk-url-input',
  templateUrl: './url-input.component.html',
  styleUrls: ['./url-input.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UrlInputComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => UrlInputComponent),
      multi: true
    }
  ]
})
export class UrlInputComponent extends DynamicFieldFormComponent<string> implements Validator {

  @Input() config: UrlInputConfiguration = { label: '', options: { requiredMessage: '', invalidValueMessage: '' } };

  matcher = new class implements ErrorStateMatcher {
    constructor(public component: UrlInputComponent) { }
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
      return !!(this.component.errorMessage || (control?.invalid && (control?.dirty || control?.touched)));
    }
  }(this);

  onValidatorChange: () => void = () => { };

  private readonly protocolPattern = /^(https?:\/\/)/i;
  private readonly urlPattern = /^https?:\/\/\S+/i;

  constructor(private cdr: ChangeDetectorRef) {
    super();
  }

  get isUrlValid(): boolean {
    if (!this._value) return false;
    return this.urlPattern.test(this._value);
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

    if (this.config.required && !value) {
      return { required: true };
    }

    if (value) {
      if (!this.protocolPattern.test(value)) {
        return { invalidProtocol: true };
      }

      if (!this.urlPattern.test(value)) {
        return { invalidUrlFormat: true };
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
      if (this.onValidatorChange) this.onValidatorChange();
    }
  }

  clickOpenUrl(): void {
    if (!this.isUrlValid) {
      return;
    }
    window.open(this._value!, '_blank')?.focus();
  }
}