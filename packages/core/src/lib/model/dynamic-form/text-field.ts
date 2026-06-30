import { DynamicField, CONTROL_TYPE } from './dynamic-field';

interface DynamicFieldOptions<T> {
    value?: T;
    key?: string;
    label?: string;
    required?: boolean;
    order?: number;
    controlType?: string;
    cssClass?: string;
}

interface TextFieldOptions extends DynamicFieldOptions<string> {
    type?: string;
}

export class TextField extends DynamicField<string> {
    override controlType = CONTROL_TYPE.Textbox;
    type: string;

    constructor(options: TextFieldOptions = {}) {
        super(options);
        this.type = options.type || '';
    }
}