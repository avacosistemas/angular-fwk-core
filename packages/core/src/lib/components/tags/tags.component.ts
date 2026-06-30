import { Component, Input, forwardRef, HostBinding, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormControl, FormGroupDirective, NG_VALUE_ACCESSOR, NgForm } from '@angular/forms';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TagsConfiguration } from './tags.interface';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { I18nService } from '../../services/i18n-service/i18n.service';
import { ErrorStateMatcher } from '@angular/material/core';

@Component({
     selector: 'fwk-tags',
    templateUrl: './tags.component.html',
    styleUrls: ['./tags.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatChipsModule,
        MatIconModule,
        MatFormFieldModule,
        MatSnackBarModule,
        TranslatePipe
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TagsComponent),
            multi: true
        }
    ]
})
export class TagsComponent implements ControlValueAccessor {

    @Input() config: TagsConfiguration = {
        required: false,
        disabled: false,
        options: {},
        label: ''
    };
    @Input() errorMessage: string | null = null;

    @HostBinding('style.opacity')
    get opacity() {
        return this.isDisabled ? 0.5 : 1;
    }

    items: string[] = [];
    isDisabled: boolean = false;
    
    matcher = new class implements ErrorStateMatcher {
        constructor(public component: TagsComponent) { }
        isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
            return !!(this.component.errorMessage || (control?.invalid && (control?.dirty || control?.touched)));
        }
    }(this);

    onChange: (value: string[] | null) => void = () => {};
    onTouch: () => void = () => {};

    readonly separatorKeysCodes: number[] = [ENTER, COMMA];
    private _i18nService = inject(I18nService);
    private _cdr = inject(ChangeDetectorRef);

    constructor(private snackBar: MatSnackBar) {}

    writeValue(value: string[] | string | null): void {
        if (typeof value === 'string' && value) {
            this.items = value.split(',').map(item => item.trim()).filter(Boolean);
        } else if (Array.isArray(value)) {
            this.items = value.filter(Boolean);
        } else {
            this.items = [];
        }
        this._cdr.markForCheck();
    }

    registerOnChange(fn: (value: string[] | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouch = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this._cdr.markForCheck();
    }

    add(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();

        if (value && !this.items.includes(value)) {
            this.items.push(value);
            this.updateChanges();
        }

        if (event.chipInput) {
            event.chipInput.clear();
        }

        this.onTouch();
    }

    remove(item: string): void {
        const index = this.items.indexOf(item);
        if (index >= 0) {
            this.items.splice(index, 1);
            this.updateChanges();
        }
        this.onTouch();
    }

    private updateChanges(): void {
        const valueToEmit = this.items.length > 0 ? this.items : null;
        this.onChange(valueToEmit);
        this._cdr.markForCheck();
    }

    copyToClipboard(item: string): void {
        if (this.isDisabled) return;
        const formattedText = `%${item}%`;
        navigator.clipboard.writeText(formattedText).then(() => {
            this.snackBar.open(this._i18nService.translate('tags_copied_message', formattedText), this._i18nService.translate('action_close'), {
                duration: 2000,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
            });
        }).catch(() => {
            this.snackBar.open(this._i18nService.translate('tags_copy_error'), this._i18nService.translate('action_close'), {
                duration: 3000,
            });
        });
    }
}