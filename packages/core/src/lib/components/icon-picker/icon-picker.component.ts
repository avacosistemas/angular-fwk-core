import { Component, ChangeDetectionStrategy, Input, forwardRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormControl, FormGroupDirective, NG_VALUE_ACCESSOR, NgForm, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, combineLatest, map, startWith } from 'rxjs';
import { IconListService } from '../../services/icon-list/icon-list.service';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { I18nService } from '../../services/i18n-service/i18n.service';
import { ErrorStateMatcher } from '@angular/material/core';

@Component({
    selector: 'fwk-icon-picker',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatInputModule, MatButtonModule, MatTooltipModule, TranslatePipe],
    templateUrl: './icon-picker.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => IconPickerComponent),
            multi: true,
        },
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconPickerComponent implements ControlValueAccessor, OnInit {
    @Input() label: string = '';
    @Input() namespace: string = 'heroicons_outline';
    @Input() showClearButton: boolean = true;
    @Input() errorMessage: string | null = null;

    private _iconListService = inject(IconListService);
    private _cdr = inject(ChangeDetectorRef);
    private _i18nService = inject(I18nService);

    _value: string | null = null;
    isDisabled = false;

    allIcons$: Observable<string[]>;
    filteredIcons$: Observable<string[]>;
    searchControl = new FormControl('');

    matcher = new class implements ErrorStateMatcher {
        constructor(public component: IconPickerComponent) { }
        isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
            return !!(this.component.errorMessage || (control?.invalid && (control?.dirty || control?.touched)));
        }
    }(this);

    onChange: (value: string | null) => void = () => { };
    onTouched: () => void = () => { };

    ngOnInit(): void {
        if (!this.label) {
            this.label = this._i18nService.translate('icon_picker_default_label');
        }
        this.allIcons$ = this._iconListService.getIconNames(this.namespace);
        this.filteredIcons$ = combineLatest([
            this.allIcons$,
            this.searchControl.valueChanges.pipe(startWith('')),
        ]).pipe(
            map(([icons, searchTerm]) => {
                if (!searchTerm) {
                    return icons;
                }
                return icons.filter(icon => icon.toLowerCase().includes(searchTerm.toLowerCase()));
            })
        );
    }

    writeValue(value: string | null): void {
        let cleanValue = value;
        const wasCorrected = value && value.startsWith(`${this.namespace}:`);

        if (wasCorrected) {
            cleanValue = value.split(':')[1];
        }

        this._value = cleanValue;

        if (wasCorrected) {
            this.onChange(cleanValue);
        }

        this._cdr.markForCheck();
    }

    registerOnChange(fn: any): void { this.onChange = fn; }
    registerOnTouched(fn: any): void { this.onTouched = fn; }
    setDisabledState?(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        isDisabled ? this.searchControl.disable() : this.searchControl.enable();
        this._cdr.markForCheck();
    }

    onSelectionChange(value: string | null): void {
        this._value = value;
        this.onChange(this._value);
        this.onTouched();
    }

    clearSelection(event: MouseEvent): void {
        event.stopPropagation();
        this.onSelectionChange(null);
    }
}