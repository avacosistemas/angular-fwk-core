import { Component, OnInit, Input, forwardRef, OnDestroy, ViewChild, ChangeDetectorRef, Optional, Host, SkipSelf, ElementRef } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, Validator, FormControl, AbstractControl, ValidationErrors, NG_VALIDATORS, ReactiveFormsModule, FormGroupDirective, NgForm, ControlContainer, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatOptionModule, ErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, Observable, of, merge, timer } from 'rxjs';

import { debounceTime, distinctUntilChanged, switchMap, takeUntil, startWith, filter, debounce } from "rxjs/operators";

import { ApiAutocompleteConfiguration, AutocompleteSearchTerm } from '../autocomplete/autocomplete.interface';
import { inject } from '@angular/core';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { AutocompleteOptions } from '../../model/dynamic-form/dynamic-field-options.interface';

@Component({
    selector: 'fwk-autocomplete-desplegable',
    templateUrl: './autocomplete-desplegable.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatOptionModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        TranslatePipe,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => AutocompleteDesplegableComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => AutocompleteDesplegableComponent),
            multi: true
        }
    ],
    viewProviders: [
        {
            provide: ControlContainer,
            useFactory: (container: ControlContainer) => container,
            deps: [[new Optional(), new SkipSelf(), ControlContainer]]
        }
    ]
})
export class AutocompleteDesplegableComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {

    @Input() config!: ApiAutocompleteConfiguration;
    @Input() searchTermInterface!: AutocompleteSearchTerm;
    @Input() errorMessage: string | null = null;

    @ViewChild('autoCompleteInput', { read: MatAutocompleteTrigger }) autoCompleteTrigger!: MatAutocompleteTrigger;
    @ViewChild('autoCompleteInput') inputElement!: ElementRef<HTMLInputElement>;


    autocompleteControl = new FormControl<string | object | null>(null);
    filteredOptions$: Observable<any[]> = of([]);
    selectedItems: any[] = [];

    matcher = new class implements ErrorStateMatcher {
        constructor(public component: AutocompleteDesplegableComponent) { }
        isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
            if (this.component.errorMessage) {
                return true;
            }
            if (this.component.isFocused) {
                return false;
            }
            return !!(control?.invalid && (control?.dirty || control?.touched));
        }
    }(this);

    private _fwkConfig = inject<FwkConfig>(FWK_CONFIG);
    private destroy$ = new Subject<void>();
    private isOptionSelected: boolean = false;
    private isComponentInitialized = false;
    private searchTrigger$ = new Subject<any>();
    isFocused: boolean = false;

    onChange: (value: any) => void = () => { };
    onTouched: () => void = () => { };

    constructor(
        private cdr: ChangeDetectorRef,
        @Optional() @Host() @SkipSelf() private controlContainer: ControlContainer
    ) { }

    ngOnInit() {
        if (!this.searchTermInterface) {
            console.error('[FWK] AutocompleteDesplegableComponent requiere un [searchTermInterface].');
            return;
        }

        this.setupFiltering();

        this.autocompleteControl.valueChanges
            .pipe(
                distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
                takeUntil(this.destroy$)
            )
            .subscribe(value => {
                if (typeof value !== 'string') {
                    this.onChange(value);
                    this.updateSiblingField(value);
                } else {
                    this.onChange(value);
                    if (!this.isOptionSelected) {
                        this.updateSiblingField(null);
                    }
                }
            });

        this.isComponentInitialized = true;
    }

    private updateSiblingField(value: any, markAsDirty: boolean = true): void {
        const options = this.config?.options as AutocompleteOptions;

        if (this.controlContainer && this.controlContainer.control) {
            const formGroup = this.controlContainer.control as FormGroup;

            if (options?.transferIdToField) {
                const targetControl = formGroup.get(options.transferIdToField);
                if (targetControl) {
                    let valToSet = null;
                    if (value && typeof value === 'object') {
                        valToSet = options.elementValue ? value[options.elementValue] : value.id;
                    }

                    if (targetControl.value !== valToSet) {
                        if (valToSet === null && targetControl.value !== null && targetControl.value !== undefined && targetControl.value !== '') {
                            const myControl = formGroup.get(this.config.key);
                            if (myControl && myControl.pristine && !myControl.touched) {
                                return;
                            }
                        }

                        targetControl.setValue(valToSet);
                        targetControl.updateValueAndValidity();
                        if (markAsDirty) targetControl.markAsDirty();
                    }
                }
            }

            if (options?.transferMap && value && typeof value === 'object') {
                Object.keys(options.transferMap).forEach(targetKey => {
                    const sourceProp = (options.transferMap as any)[targetKey];
                    const targetControl = formGroup.get(targetKey);
                    if (targetControl && value[sourceProp] !== undefined) {
                        const valToSet = value[sourceProp];
                        if (targetControl.value !== valToSet) {
                            targetControl.setValue(valToSet);
                            targetControl.updateValueAndValidity();
                            if (markAsDirty) targetControl.markAsDirty();
                        }
                    }
                });
            }
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private setupFiltering(): void {
        const options = this.config?.options as AutocompleteOptions;
        const searchOnFocus = options?.searchOnFocus !== false;

        const inputChanges$ = this.autocompleteControl.valueChanges.pipe(
            startWith(searchOnFocus ? '' : null)
        );

        this.filteredOptions$ = merge(inputChanges$, this.searchTrigger$).pipe(
            takeUntil(this.destroy$),
            filter(() => !this.autocompleteControl.disabled),
            debounce(value => {
                const term = typeof value === 'string' ? value : '';
                const wait = (term === '') ? 0 : (this._fwkConfig.autocompleteWaitingTime ?? 300);
                return timer(wait);
            }),

            switchMap(value => {
                if (this.isOptionSelected) {
                    this.isOptionSelected = false;
                    return of([]);
                }

                const isObject = typeof value === 'object' && value !== null;
                const searchTerm = isObject ? '' : (typeof value === 'string' ? value : '');

                if (isObject || (searchTerm === '' && !searchOnFocus)) {
                    return of([]);
                }

                return this.searchTermInterface.search(searchTerm);
            })
        );
    }

    writeValue(value: any): void {
        if (this.config?.options?.multiple) {
            if (Array.isArray(value)) {
                if (value.length > 0 && typeof value[0] === 'object') {
                    this.selectedItems = [...value];
                } else {
                    const options = this.config?.options as AutocompleteOptions;
                    this.selectedItems = value.map(id => ({
                        [options.elementValue || 'id']: id,
                        [options.elementLabel || 'name']: id
                    }));
                }
            } else {
                this.selectedItems = [];
            }
            this.autocompleteControl.setValue('', { emitEvent: false });
        } else {
            this.autocompleteControl.setValue(value, { emitEvent: false });

            if (value) {
                this.updateSiblingField(value, false);
            } else {
                this.isOptionSelected = false;

                this.autocompleteControl.setValue('', { emitEvent: false });

                this.autocompleteControl.markAsPristine();
                this.autocompleteControl.markAsUntouched();
                this.autocompleteControl.setErrors(null);
            }
        }

        this.cdr.markForCheck();
    }

    registerOnChange(fn: (value: any) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        isDisabled ? this.autocompleteControl.disable() : this.autocompleteControl.enable();
        this.cdr.markForCheck();
    }

    validate(control: AbstractControl): ValidationErrors | null {
        const isRequired = this.config?.required;

        if (this.config?.options?.multiple) {
            if (isRequired && (!this.selectedItems || this.selectedItems.length === 0)) {
                return { required: true };
            }
            return null;
        }

        const value = this.autocompleteControl.value;
        if (isRequired && (value === null || value === undefined || value === '')) {
            return { required: true };
        }

        const options = this.config?.options as AutocompleteOptions;

        if (typeof value === 'string' && value.trim() !== '' && !options?.allowFreeText) {
            return { selectOrCleanField: true };
        }

        return null;
    }

    displayWith = (value: any): string => {
        if (!value || typeof value !== 'object') {
            return typeof value === 'string' ? value : '';
        }

        const labelKey = this.config?.options?.elementLabel;

        if (labelKey && value[labelKey]) {
            return value[labelKey];
        }

        return '';
    }

    onOptionSelected(): void {
        this.isOptionSelected = true;
        this.onTouched();
        this.autocompleteControl.updateValueAndValidity();
        this.cdr.markForCheck();

        if (this.config?.options?.multiple) {
            setTimeout(() => {
                this.addItem();
            }, 0);
        }
    }

    addItem(event?: MouseEvent): void {
        if (event) event.stopPropagation();
        const value = this.autocompleteControl.value;
        if (!value || typeof value !== 'object') return;

        const valObj = value as any;
        const options = this.config?.options as AutocompleteOptions;
        const valId = options.elementValue ? valObj[options.elementValue] : valObj.id;

        const exists = this.selectedItems.some(item => {
            const itemId = options.elementValue ? item[options.elementValue] : item.id;
            return itemId === valId;
        });

        if (!exists) {
            this.selectedItems.push(value);
            this.propagateMultipleChanges();
        }

        this.autocompleteControl.setValue('', { emitEvent: true });
        this.isOptionSelected = false;
        this.cdr.markForCheck();
    }

    removeItem(itemToRemove: any, event: MouseEvent): void {
        event.stopPropagation();
        const options = this.config?.options as AutocompleteOptions;
        const removeId = options.elementValue ? itemToRemove[options.elementValue] : itemToRemove.id;

        this.selectedItems = this.selectedItems.filter(item => {
            const itemId = options.elementValue ? item[options.elementValue] : item.id;
            return itemId !== removeId;
        });

        this.propagateMultipleChanges();
        this.cdr.markForCheck();
    }

    private propagateMultipleChanges(): void {
        const options = this.config?.options as AutocompleteOptions;
        const ids = this.selectedItems.map(item => options.elementValue ? item[options.elementValue] : item.id);

        this.onChange(ids);

        if (this.controlContainer && this.controlContainer.control) {
            const formGroup = this.controlContainer.control as FormGroup;
            if (options?.transferIdToField) {
                const targetControl = formGroup.get(options.transferIdToField);
                if (targetControl) {
                    targetControl.setValue(ids);
                    targetControl.updateValueAndValidity();
                    targetControl.markAsDirty();
                }
            }
        }
    }

    onInputFocus(): void {
        this.isFocused = true;
        this.cdr.markForCheck();

        if (this.autoCompleteTrigger) {
            setTimeout(() => {
                if (this.autoCompleteTrigger.panelOpen) {
                    this.autoCompleteTrigger.updatePosition();
                }
            }, 100);
            setTimeout(() => {
                if (this.autoCompleteTrigger.panelOpen) {
                    this.autoCompleteTrigger.updatePosition();
                }
            }, 300);
        }
    }

    onInputBlur(): void {
        setTimeout(() => {
            this.isFocused = false;
            this.onTouched();
            this.autocompleteControl.updateValueAndValidity();
            this.cdr.markForCheck();
        }, 200);
    }

    triggerSearch(): void {
        if (!this.autocompleteControl.disabled) {
            const val = this.autocompleteControl.value;

            this.searchTrigger$.next(val);

            setTimeout(() => {
                if (this.autoCompleteTrigger) {
                    this.autoCompleteTrigger.updatePosition();
                    this.autoCompleteTrigger.openPanel();
                }
            }, 400);
        }
    }

    openDropdown(): void {
        if (this.autoCompleteTrigger) {
            const val = this.autocompleteControl.value;
            this.searchTrigger$.next(val);
            setTimeout(() => {
                this.autoCompleteTrigger.updatePosition();
                this.autoCompleteTrigger.openPanel();
            }, 300);
        }
    }



    clear(event: MouseEvent): void {
        event.stopPropagation();
        this.autocompleteControl.setValue('', { emitEvent: true });
        this.onChange(null);
        this.updateSiblingField(null);
        this.onTouched();

        if (this.inputElement) {
            this.inputElement.nativeElement.focus();
        }

        if (this.autoCompleteTrigger) {
            this.autoCompleteTrigger.openPanel();
        }
        this.searchTrigger$.next('');
        this.cdr.markForCheck();
    }
}


