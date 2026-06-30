import { Observable } from "rxjs";

export interface AutocompleteConfiguration {
    key: string;
    label: string;
    required?: boolean;
    disabled?: boolean;
    value?: string;
    options?: AutocompleteOptions;
}

export interface AutocompleteOptions {
    requiredMessage?: string;
    invalidValueMessage?: string;
    selectElementOrCleanField?: string;
    elementLabel: string;
    elementValue: string;
    useNativeFilter?: boolean;
    transferIdToField: string;

    minTermLength?: number;
    useFormSenderFilter?: boolean;
    searchOnFocus?: boolean;
    allowFreeText?: boolean;
    multiple?: boolean;
}

export interface AutocompleteChangeValue {
    value: string;
}

export interface AutocompleteSearchTerm {
    search(term: string): Observable<any[]>;
}


export interface ApiAutocompleteConfiguration extends AutocompleteConfiguration {
    apiOptions: ApiAutocompleteOptions;
}

export interface ApiAutocompleteOptions {
    queryString?: any;
    url?: string;
    fromData?: any[];
    defaultShow?: number;
}
