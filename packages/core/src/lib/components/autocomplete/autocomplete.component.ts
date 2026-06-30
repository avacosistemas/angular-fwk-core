import { Component, OnInit, Input, forwardRef, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';


import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, Validator, FormControl, AbstractControl, ValidationErrors, NG_VALIDATORS, ReactiveFormsModule, FormGroupDirective, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';

import { MatOptionModule, ErrorStateMatcher } from '@angular/material/core';
import { Subject, Observable, of, timer } from 'rxjs';

import { debounceTime, distinctUntilChanged, switchMap, takeUntil, debounce } from "rxjs/operators";

import { AutocompleteConfiguration, AutocompleteSearchTerm } from './autocomplete.interface';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';


@Component({
    selector: 'fwk-autocomplete',
    templateUrl: './autocomplete.component.html',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatOptionModule,
        TranslatePipe,
        MatButtonModule,
        MatIconModule,
    ],

    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => AutocompleteComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => AutocompleteComponent),
            multi: true
        }
    ]
})
export class AutocompleteComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {

    @Input() config!: AutocompleteConfiguration;
    @Input() searchTermInterface!: AutocompleteSearchTerm;
    @Input() errorMessage: string | null = null;

    @ViewChild(MatAutocompleteTrigger) autocompleteTrigger!: MatAutocompleteTrigger;
    @ViewChild('inputElement') inputElement!: ElementRef<HTMLInputElement>;


    autocompleteControl = new FormControl<string | object | null>(null);

    filteredOptions$: Observable<any[]> = of([]);

    matcher = new class implements ErrorStateMatcher {
        constructor(public component: AutocompleteComponent) { }
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

    private destroy$ = new Subject<void>();
    private focus$ = new Subject<string | null>();
    private isOptionSelected: boolean = false;
    isFocused: boolean = false;

    onChange: (value: any) => void = () => { };
    onTouched: () => void = () => { };

    constructor(private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        if (!this.searchTermInterface) {
            console.error('[FWK] AutocompleteComponent requiere un [searchTermInterface].');
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
                } else {
                    this.onChange(value);
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        this.focus$.complete();
    }

    private setupFiltering(): void {
        const valueChanges$ = this.autocompleteControl.valueChanges.pipe(
            debounce(value => {
                const term = typeof value === 'string' ? value : '';
                const wait = (term === '') ? 0 : 300;
                return timer(wait);
            }),
            distinctUntilChanged()
        );

        const triggers$ = new Observable<string | null>(observer => {
            this.focus$.subscribe(val => observer.next(val));
            valueChanges$.subscribe(val => observer.next(typeof val === 'string' ? val : ''));
        });

        this.filteredOptions$ = triggers$.pipe(
            takeUntil(this.destroy$),
            switchMap(value => {
                const isObject = typeof value === 'object' && value !== null;
                const term = isObject ? '' : (value || '');

                if (this.isOptionSelected || isObject) {
                    this.isOptionSelected = false;
                    return of([]);
                }

                const minLength = this.config.options?.minTermLength ?? 1;
                const searchOnFocus = this.config.options?.searchOnFocus ?? true;

                if (term.length < minLength && !searchOnFocus) {
                    return of([]);
                }

                return this.searchTermInterface.search(term);
            })
        );
    }

    onFocus(): void {
        this.isFocused = true;
        this.cdr.markForCheck();
        const value = this.autocompleteControl.value;
        this.focus$.next(typeof value === 'string' ? value : '');
        this.onTouched();
        
        if (this.autocompleteTrigger) {
            setTimeout(() => {
                if (this.autocompleteTrigger.panelOpen) {
                    this.autocompleteTrigger.updatePosition();
                }
            }, 100);
            setTimeout(() => {
                if (this.autocompleteTrigger.panelOpen) {
                    this.autocompleteTrigger.updatePosition();
                }
            }, 300);
        }
    }

    onBlur(): void {
        setTimeout(() => {
            this.isFocused = false;
            this.onTouched();
            this.autocompleteControl.updateValueAndValidity();
            this.cdr.markForCheck();
        }, 200);
    }

    writeValue(value: any): void {
        this.autocompleteControl.setValue(value, { emitEvent: false });
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
        const value = this.autocompleteControl.value;
        const isRequired = this.config?.required;

        if (isRequired && (value === null || value === undefined || value === '')) {
            return { required: true };
        }

        if (typeof value === 'string' && value.trim() !== '' && !this.config?.options?.allowFreeText) {
            return { selectOrCleanField: true };
        }

        return null;
    }

    displayWith = (value: any): string => {
        if (!value || typeof value === 'string') {
            return '';
        }
        const labelKey = this.config?.options?.elementLabel;
        return labelKey && value[labelKey] ? value[labelKey] : '';
    }

    onOptionSelected(): void {
        this.isOptionSelected = true;
        this.onTouched();
        this.autocompleteControl.updateValueAndValidity();
        this.cdr.markForCheck();
    }

    clear(event: MouseEvent): void {
        event.stopPropagation();
        this.autocompleteControl.setValue('', { emitEvent: true });
        this.onChange(null);
        this.onTouched();

        if (this.inputElement) {
            this.inputElement.nativeElement.focus();
        }

        if (this.autocompleteTrigger) {
            setTimeout(() => {
                this.autocompleteTrigger.updatePosition();
                this.autocompleteTrigger.openPanel();
            }, 300);
        }
        this.cdr.markForCheck();
    }
}