import { WsDef } from "../ws-def";

export interface BaseFieldOptions {
    floatLabel?: 'auto' | 'always' | 'never';
    matLabel?: string;
    restrictionKeys?: string;
    handlerSourceData?: boolean;
    fromWs?: WsDef;
    baseFilter?: boolean;
    hidden?: boolean;
}

export interface TextboxOptions extends BaseFieldOptions {
    type?: 'text' | 'tel' | 'url';
    prefix?: string;
}

export interface NumberOptions extends BaseFieldOptions {
    prefix?: string;
}

export interface SelectOptions extends BaseFieldOptions {
    fromData?: any[];
    elementValue?: string;
    elementLabel?: string;
}

export interface RadioButtonOptions extends BaseFieldOptions {
    options: { label: string, value: any }[];
}

export interface IconPickerOptions extends BaseFieldOptions {
    namespace?: string;
}

export interface AutocompleteOptions extends BaseFieldOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
    selectElementOrCleanField?: string;
    elementLabel: string;
    elementValue: string;
    useNativeFilter?: boolean;
    transferIdToField?: string;
    transferMap?: { [targetKey: string]: string };
    minTermLength?: number;
    useFormSenderFilter?: boolean;
    fromData?: any[];
    searchOnFocus?: boolean;
    allowFreeText?: boolean;
    multiple?: boolean;
}

export interface PickListOptions extends BaseFieldOptions {
    titleFrom?: string;
    titleTo?: string;
    titleFromKey?: string;
    titleToKey?: string;
    elementLabel: string;
    fromData?: any[];
}

export interface SimplePickListOptions extends PickListOptions {
    compositeKey?: string[];
}

export interface DisclaimerOptions extends BaseFieldOptions {
    disclaimer?: {
        label?: string;
        labelKey?: string;
        content: string;
    };
}

export interface DatepickerOptions extends BaseFieldOptions {
    format?: string;
    withHourAndMin?: boolean;
    disabledPicker?: boolean;
}

export interface FloatOptions extends BaseFieldOptions {
    delim?: string;
    decimalMaxLength?: number;
    outputFormatDelim?: string;
}

export interface TagsOptions extends BaseFieldOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
    width?: string;
    placeholder?: string;
    inputPlaceholder?: string;
}

export interface UrlInputOptions extends BaseFieldOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
    resourceType?: 'Images' | 'Files';
}

export interface FileOptions extends BaseFieldOptions {
    acceptTypes?: string;
    width?: string;
    height?: string;
    shape?: string;
    previewField?: string;
    multiple?: boolean;
    maxFiles?: number;
    outputFormat?: 'byteArray' | 'object';
}

export interface ColorPickerOptions extends BaseFieldOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
}

export interface AlertOptions extends BaseFieldOptions {
    type?: 'info' | 'success' | 'warning' | 'error';
    appearance?: 'soft' | 'outline' | 'fill';
    showIcon?: boolean;
    translateArgs?: any;
}

export type DynamicFieldOptions =
    | BaseFieldOptions
    | TextboxOptions
    | NumberOptions
    | SelectOptions
    | RadioButtonOptions
    | AutocompleteOptions
    | PickListOptions
    | SimplePickListOptions
    | DisclaimerOptions
    | DatepickerOptions
    | FloatOptions
    | TagsOptions
    | UrlInputOptions
    | FileOptions
    | ColorPickerOptions
    | IconPickerOptions
    | AlertOptions;