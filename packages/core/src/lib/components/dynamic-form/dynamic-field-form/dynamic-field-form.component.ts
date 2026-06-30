import { Directive, Input } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { DynamicField } from '../../../model/dynamic-form/dynamic-field';

@Directive()
export abstract class DynamicFieldFormComponent<T> implements ControlValueAccessor {

    @Input() field!: DynamicField<any>;
    @Input() errorMessage: string | null = null;
    protected _value: T | null = null;

    isDisabled: boolean = false;

    onChange: (value: T | null) => void = () => {};

    onTouch: () => void = () => {};

    writeValue(value: T | null): void {
        this._value = value;
    }

    registerOnChange(fn: (value: T | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouch = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    getFloatLabel(): 'auto' | 'always' | 'never' {
        return this.field?.options?.['floatLabel'] ?? 'auto';
    }

    getRestrictionKeys(): string | undefined {
        return this.field?.options?.restrictionKeys;
    }
}