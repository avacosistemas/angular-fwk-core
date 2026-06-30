import { Component, forwardRef, inject, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { DialogService } from '../../../services/dialog-service/dialog.service';
import { DynamicFieldFormComponent } from '../dynamic-field-form/dynamic-field-form.component';
import { DisclaimerOptions } from '../../../model/dynamic-form/dynamic-field-options.interface';
import { I18nService } from '../../../services/i18n-service/i18n.service';

@Component({
     selector: 'fwk-disclaimer',
    templateUrl: './disclaimer.component.html',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCheckboxModule
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DisclaimerComponent),
            multi: true
        }
    ]
})
export class DisclaimerComponent extends DynamicFieldFormComponent<boolean> implements ControlValueAccessor {

    @Input() errorMessage: string | null = null;

    private i18nService = inject(I18nService);

    constructor(
        private dialogService: DialogService,
        private cdr: ChangeDetectorRef
    ) {
        super();
    }
    
    private translate(key: string): string {
        return this.i18nService.getDictionary('fwk')?.translate?.(key) || key;
    }

    private get disclaimerOptions(): DisclaimerOptions {
        return this.field?.options as DisclaimerOptions;
    }

    override writeValue(value: any): void {
        this._value = !!value;
        this.cdr.markForCheck();
    }

    override setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this.cdr.markForCheck();
    }

    onCheckboxChange(checked: boolean): void {
        if (!this.isDisabled) {
            this._value = checked;
            this.onChange(this._value);
            this.onTouch();
            this.cdr.markForCheck();
        }
    }

    openDisclaimer(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        const disclaimer = this.disclaimerOptions?.disclaimer;
        if (disclaimer?.content) {
            const data = {
                title: disclaimer.label || this.translate('terms_and_conditions_default_title'),
                html: disclaimer.content,
            };
            this.dialogService.openHtmlModal(data, { width: '80vw', maxWidth: '900px' });
        }
    }
}