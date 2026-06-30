import { DynamicField } from './dynamic-field';

export class ThenDynamicField extends DynamicField<any>{
  showErrorMsgKey?: string;
  showErrorMsg?: string;
  validationWs?: {
    url: string;
    param: string;
    valueProperty?: string;
    assignResultToField?: string;
    errorMessageKey?: string;
    errorMessage?: string;
    showModalOnFail?: boolean;
  };
  showModal?: string | { title?: string; message: string; buttonLabel?: string };
}
