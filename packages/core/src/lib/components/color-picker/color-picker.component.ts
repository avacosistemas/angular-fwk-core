import { Component, OnInit, Input, forwardRef, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, Validator, FormControl, AbstractControl, ValidationErrors, NG_VALIDATORS, ReactiveFormsModule, FormGroupDirective, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ColorPickerConfiguration } from './color-picker.interface';
import { TranslatePipe } from '../../pipe/translate.pipe'; 
import { MatTooltipModule } from '@angular/material/tooltip'; 
import { ColorPickerModule, ColorPickerService, ColorPickerDirective } from 'ngx-color-picker'; 
import { ErrorStateMatcher } from '@angular/material/core';

@Component({
   selector: 'fwk-color-picker',
  templateUrl: './color-picker.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ColorPickerModule,
    TranslatePipe,
    MatTooltipModule
  ],
  providers: [
    ColorPickerService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ColorPickerComponent),
      multi: true
    }
  ]
})
export class ColorPickerComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {

  @Input() config: ColorPickerConfiguration = { key: 'color-picker', label: 'Color' };
  @Input() errorMessage: string | null = null;

  @ViewChild('pickerDirectiveElement', { read: ColorPickerDirective }) pickerDirective: ColorPickerDirective;

  colorControl = new FormControl<string | null>(null);
  private destroy$ = new Subject<void>();
  private readonly hexPattern = /^#([a-fA-F0-9]{6})$/;

  matcher = new class implements ErrorStateMatcher {
    constructor(public component: ColorPickerComponent) { }
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        return !!(this.component.errorMessage || (control?.invalid && (control?.dirty || control?.touched)));
    }
  }(this);

  onChange: (value: string | null) => void = () => { };
  onTouched: () => void = () => { };
  onValidatorChange: () => void = () => { };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.colorControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (value === null || this.hexPattern.test(value)) {
            this.onChange(value);
        }
      });

    if (this.config.value) {
      this.colorControl.setValue(this.config.value, { emitEvent: false });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: string | null): void {
    this.colorControl.setValue(value, { emitEvent: false });
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.colorControl.disable() : this.colorControl.enable();
    this.cdr.markForCheck();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = this.colorControl.value;

    if (this.config.required && (!value || value.trim() === '')) {
      return { required: true };
    }

    if (value && !this.hexPattern.test(value)) {
      return { invalidValue: true };
    }

    return null;
  }

  updateColor(color: string): void {
    this.colorControl.setValue(color);
    this.onTouched();
  }
  
  openPicker(): void {
      if (this.pickerDirective && !this.colorControl.disabled) {
          this.pickerDirective.openDialog();
      }
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}