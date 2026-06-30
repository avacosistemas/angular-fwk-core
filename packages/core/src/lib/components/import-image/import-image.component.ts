import { Component, forwardRef, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, Validator, AbstractControl, ValidationErrors, NG_VALIDATORS, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImportImageConfiguration } from './import-image.interface';
import { DynamicFieldFormComponent } from '../dynamic-form/dynamic-field-form/dynamic-field-form.component';
import { TranslatePipe } from '../../pipe/translate.pipe';

declare const CKFinder: any;

@Component({
   selector: 'fwk-import-image',
  templateUrl: './import-image.component.html',
  styleUrls: ['./import-image.component.scss'],
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
      useExisting: forwardRef(() => ImportImageComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ImportImageComponent),
      multi: true
    }
  ]
})
export class ImportImageComponent extends DynamicFieldFormComponent<string> implements Validator {

  @Input() config: ImportImageConfiguration = { label: '', options: { requiredMessage: '', invalidValueMessage: '' } };

  onValidatorChange: () => void = () => { };

  private readonly urlPattern = new RegExp('^https?://\\S+', 'i');

  constructor(private cdr: ChangeDetectorRef) {
    super();
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
    if (this.config.required && !control.value) {
      return { required: true };
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

  clickOpenUrl(): void {
    if (!this._value) {
      return;
    }

    if (this.urlPattern.test(this._value)) {
      window.open(this._value, '_blank')?.focus();
    }
    else if (this._value.startsWith('/')) {
      window.open(this._value, '_blank')?.focus();
    }
    else {
      window.open(this._value, '_blank')?.focus();
    }
  }

  clickOpenCkfinder(): void {
    if (this.isDisabled) return;

    try {
      CKFinder.popup({
        chooseFiles: true,
        onInit: (finder: any) => {
          finder.on('files:choose', (evt: any) => {
            const file = evt.data.files.first();
            const url = file.getUrl();
            this._value = url;
            this.onChange(url);
            this.onTouch();
            this.cdr.markForCheck();
          });
        }
      });
    } catch (error) {
      console.error('CKFinder no está disponible. Asegúrate de que el script está cargado en tu index.html.', error);
    }
  }
}