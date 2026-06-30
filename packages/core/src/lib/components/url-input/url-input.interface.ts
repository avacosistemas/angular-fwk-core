export interface UrlInputConfiguration {
    label: string;
    required?: boolean;
    disabled?: boolean;
    value?: string;
    options?: UrlInputOptions;
    icon?: string;
    iconOpenUrl?: string;
    showPreview?: boolean;
}


export interface UrlInputOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
    resourceType?: string;
}
