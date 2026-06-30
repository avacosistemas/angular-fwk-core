export interface ColorPickerConfiguration {
    key: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    value?: string;
    options?: ColorPickerInvalidOptions;
}


export interface ColorPickerInvalidOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
}