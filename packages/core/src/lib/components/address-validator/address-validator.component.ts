import { Component, Input, OnInit, OnDestroy, forwardRef, ChangeDetectorRef, ElementRef, Optional, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { DynamicField } from '../../model/dynamic-form/dynamic-field';
import { GoogleMapsAddressService, GoogleNormalizedAddress } from '../../services/google-maps-address/google-maps-address.service';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';

@Component({
  selector: 'fwk-address-validator',
  templateUrl: './address-validator.component.html',
  styleUrls: ['./address-validator.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AddressValidatorComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => AddressValidatorComponent),
      multi: true
    }
  ]
})
export class AddressValidatorComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {
  @Input() field!: DynamicField<any>;
  @Input() parentForm!: FormGroup;

  isSearching: boolean = false;
  isValidated: boolean = false;
  errorMessage: string | null = null;
  suggestions: GoogleNormalizedAddress[] = [];
  showSuggestions: boolean = false;
  selectedAddress: GoogleNormalizedAddress | null = null;

  private sub: Subscription = new Subscription();

  onChange: (value: any) => void = () => {};
  onTouch: () => void = () => {};

  constructor(
    private googleMapsService: GoogleMapsAddressService,
    private cdr: ChangeDetectorRef,
    private el: ElementRef,
    @Optional() @Inject(FWK_CONFIG) private fwkConfig?: FwkConfig
  ) {}

  private scrollToComponent(): void {
    setTimeout(() => {
      try {
        this.el.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        // Fallback
      }
    }, 150);
  }

  get provinciaKey(): string {
    return this.field?.options?.['provinciaKey'] || 'provincia';
  }

  get calleKey(): string {
    return this.field?.options?.['calleKey'] || 'calle';
  }

  get alturaKey(): string {
    return this.field?.options?.['alturaKey'] || 'altura';
  }

  get localidadKey(): string {
    return this.field?.options?.['localidadKey'] || 'localidad';
  }

  get codigoPostalKey(): string {
    return this.field?.options?.['codigoPostalKey'] || 'codigoPostal';
  }

  get autoValidate(): boolean {
    return !!this.field?.options?.['autoValidate'];
  }

  get apiKey(): string | undefined {
    return this.field?.options?.['apiKey'] || this.fwkConfig?.googleMapsApiKey;
  }

  ngOnInit(): void {
    if (this.parentForm) {
      this.initFieldSequence();

      if (this.autoValidate) {
        const keys = [this.provinciaKey, this.localidadKey, this.calleKey, this.alturaKey];
        keys.forEach(k => {
          const ctrl = this.parentForm.get(k);
          if (ctrl) {
            this.sub.add(
              ctrl.valueChanges.pipe(debounceTime(1200)).subscribe(() => {
                if (this.canValidate() && !this.isValidated && !this.isSearching) {
                  this.onValidateClick();
                }
              })
            );
          }
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private initFieldSequence(): void {
    const cpCtrl = this.parentForm.get(this.codigoPostalKey);
    if (cpCtrl) {
      cpCtrl.disable({ emitEvent: false });
    }

    if (this.isValidated) {
      this.disableTargetInputs();
      return;
    }

    this.applyFieldCascadeState();

    const watchKeys = [this.provinciaKey, this.localidadKey, this.calleKey];
    watchKeys.forEach(key => {
      const ctrl = this.parentForm.get(key);
      if (ctrl) {
        this.sub.add(
          ctrl.valueChanges.subscribe(() => {
            if (!this.isValidated) {
              this.applyFieldCascadeState();
            }
          })
        );
      }
    });
  }

  private applyFieldCascadeState(): void {
    const provCtrl = this.parentForm.get(this.provinciaKey);
    const locCtrl = this.parentForm.get(this.localidadKey);
    const calleCtrl = this.parentForm.get(this.calleKey);
    const altCtrl = this.parentForm.get(this.alturaKey);
    const cpCtrl = this.parentForm.get(this.codigoPostalKey);

    if (cpCtrl && cpCtrl.enabled) {
      cpCtrl.disable({ emitEvent: false });
    }

    const hasProv = !!(provCtrl?.value && String(provCtrl.value).trim());
    const hasLoc = !!(locCtrl?.value && String(locCtrl.value).trim());
    const hasCalle = !!(calleCtrl?.value && String(calleCtrl.value).trim());

    if (locCtrl) {
      if (hasProv) {
        if (locCtrl.disabled) locCtrl.enable({ emitEvent: false });
      } else {
        if (locCtrl.enabled) {
          locCtrl.disable({ emitEvent: false });
          locCtrl.setValue('', { emitEvent: false });
        }
      }
    }

    if (calleCtrl) {
      if (hasProv && hasLoc) {
        if (calleCtrl.disabled) calleCtrl.enable({ emitEvent: false });
      } else {
        if (calleCtrl.enabled) {
          calleCtrl.disable({ emitEvent: false });
          calleCtrl.setValue('', { emitEvent: false });
        }
      }
    }

    if (altCtrl) {
      if (hasProv && hasLoc && hasCalle) {
        if (altCtrl.disabled) altCtrl.enable({ emitEvent: false });
      } else {
        if (altCtrl.enabled) {
          altCtrl.disable({ emitEvent: false });
          altCtrl.setValue('', { emitEvent: false });
        }
      }
    }

    this.cdr.markForCheck();
  }

  writeValue(value: any): void {
    if (value && typeof value === 'object' && value.validated) {
      this.isValidated = true;
      this.selectedAddress = value.address || null;
      this.disableTargetInputs();
    } else if (value === true) {
      this.isValidated = true;
      this.disableTargetInputs();
    } else {
      this.isValidated = false;
      this.selectedAddress = null;
      if (this.parentForm) {
        this.applyFieldCascadeState();
      }
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // 
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.isValidated) {
      return { addressNotValidated: true };
    }
    return null;
  }

  canValidate(): boolean {
    if (!this.parentForm) return false;
    const provincia = this.parentForm.get(this.provinciaKey)?.value;
    const localidad = this.parentForm.get(this.localidadKey)?.value;
    const calle = this.parentForm.get(this.calleKey)?.value;
    const alturaCtrl = this.parentForm.get(this.alturaKey);
    const altura = alturaCtrl?.value;

    if (!provincia || !String(provincia).trim()) return false;
    if (!localidad || !String(localidad).trim()) return false;
    if (!calle || !String(calle).trim()) return false;
    if (!altura || !String(altura).trim()) return false;

    const alturaNum = Number(altura);
    if (isNaN(alturaNum) || alturaNum < 1 || alturaNum > 28000) {
      return false;
    }

    return true;
  }

  onValidateClick(): void {
    if (!this.canValidate() || this.isSearching) return;

    this.errorMessage = null;
    this.suggestions = [];
    this.showSuggestions = false;
    this.isSearching = true;
    this.cdr.markForCheck();

    const provincia = this.parentForm.get(this.provinciaKey)?.value;
    const localidad = this.parentForm.get(this.localidadKey)?.value;
    const calle = this.parentForm.get(this.calleKey)?.value;
    const altura = this.parentForm.get(this.alturaKey)?.value;

    this.googleMapsService.geocodeAddress(
      String(provincia),
      String(localidad),
      String(calle),
      String(altura),
      this.apiKey
    ).subscribe({
      next: (results) => {
        this.isSearching = false;
        if (!results || results.length === 0) {
          this.errorMessage = 'No se encontró la dirección indicada o no fue posible validar calle y altura en Google Maps. Verifique los datos ingresados.';
          this.cdr.markForCheck();
          return;
        }

        const validResults = results.filter(r => {
          const isPrecise = !!r.hasStreetNumber || r.types?.some(t => ['street_address', 'premise', 'subpremise'].includes(t));
          return isPrecise;
        });

        if (validResults.length === 0) {
          this.errorMessage = 'La altura o número ingresado no existe para esa calle en la localidad indicada.';
          this.cdr.markForCheck();
          return;
        }

        this.suggestions = validResults;
        this.showSuggestions = true;
        this.scrollToComponent();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSearching = false;
        console.error('Error al validar domicilio en Google Maps:', err);
        this.errorMessage = 'Error al comunicarse con el servicio de Google Maps. Verifique la conexión o API Key.';
        this.cdr.markForCheck();
      }
    });
  }

  selectAddress(item: GoogleNormalizedAddress): void {
    this.selectedAddress = item;
    this.isValidated = true;
    this.showSuggestions = false;
    this.errorMessage = null;

    if (this.parentForm) {
      if (item.calle) this.parentForm.get(this.calleKey)?.setValue(item.calle);
      if (item.altura) this.parentForm.get(this.alturaKey)?.setValue(item.altura);
      if (item.localidad) this.parentForm.get(this.localidadKey)?.setValue(item.localidad);
      if (item.provincia) {
        const provCtrl = this.parentForm.get(this.provinciaKey);
        if (!provCtrl?.value) {
          provCtrl?.setValue(item.provincia);
        } else {
          const currentVal = String(provCtrl.value).trim().toLowerCase();
          const newVal = String(item.provincia).trim().toLowerCase();
          if (currentVal !== newVal) {
            provCtrl.setValue(item.provincia);
          }
        }
      }
      if (item.codigoPostal) this.parentForm.get(this.codigoPostalKey)?.setValue(item.codigoPostal);

      this.disableTargetInputs();
      this.parentForm.markAsDirty();
    }

    this.onChange({
      validated: true,
      address: item
    });
    this.onTouch();
    this.cdr.markForCheck();
  }

  onResetClick(): void {
    this.isValidated = false;
    this.selectedAddress = null;
    this.showSuggestions = false;
    this.errorMessage = null;

    this.enableTargetInputs();
    this.applyFieldCascadeState();

    this.onChange(null);
    this.onTouch();
    this.cdr.markForCheck();
  }

  closeSuggestions(): void {
    this.showSuggestions = false;
    this.cdr.markForCheck();
  }

  private disableTargetInputs(): void {
    if (!this.parentForm) return;
    [this.provinciaKey, this.calleKey, this.alturaKey, this.localidadKey, this.codigoPostalKey].forEach(k => {
      this.parentForm.get(k)?.disable({ emitEvent: false });
    });
  }

  private enableTargetInputs(): void {
    if (!this.parentForm) return;
    this.parentForm.get(this.provinciaKey)?.enable({ emitEvent: false });
    this.applyFieldCascadeState();
  }
}
