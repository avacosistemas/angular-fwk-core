export interface TagsConfiguration {
    label: string;
    required?: boolean;
    disabled?: boolean;
    value?: string;
    options?: TagsInvalidOptions;
}

export interface TagsInvalidOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
    width?: string;
    placeholder?: string;
    inputPlaceholder?: string;
}


export interface TagsOptions {
    width?: string;
    placeholder?: string;
    inputPlaceholder?: string;
}