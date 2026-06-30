export interface ImportImageConfiguration {
    label: string;
    required?: boolean;
    disabled?: boolean;
    value?: string;
    options?: ImportImageOptions;
    icon?: string;
    iconOpenUrl?: string;
    showPreview?: boolean;
}


export interface ImportImageOptions {
    requiredMessage: string;
    invalidValueMessage: string;
    resourceType?: string;
}
