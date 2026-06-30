import { DynamicField } from './dynamic-form/dynamic-field';
import { Params } from '@angular/router';

export const HTTP_METHODS = {
    post: 'POST',
    put: 'PUT',
    delete: 'DELETE',
    delete_ternaria: 'DELETE_TERNARIA',
    get: 'GET'
};

export class WsDef {
    key!: string;
    url!: string;
    confirm?: boolean;
    method?: string;
    filter?: DynamicField<any>;
    querystring?: Params;
    messageSuccess?: string;
    messageError?: string;
}