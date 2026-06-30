import { WsDef } from '../ws-def';
import { DynamicField } from '../dynamic-form/dynamic-field';
import { FormDef } from '../form-def';

export const ACTION_TYPES = {
  normal: 'normal',
  notification: 'notification',
  redirect: 'redirect',
  html_modal: 'html_modal',
  form_modal: 'form_modal',
  grid_modal: 'grid_modal',
  file_download: 'file_download',
  file_preview: 'file_preview'
};

export class ActionDef {
  actionNameKey?: string;

  actionName?: string;
  title?: string;
  icon?: string;

  color?: 'primary' | 'accent' | 'warn';
  type?: 'warn' | 'error' | 'info' | 'success' | 'primary' | 'accent' | 'basic';
  appearance?: 'stroked' | 'flat' | 'basic' | 'icon';
  hidden?: boolean;
  disabled?: boolean;

  form?: DynamicField<any>[];
  formDef?: FormDef;
  actionType?: string;
  actionSecurity?: string;
  htmlModal?: { attributeMapping: string };
  titleKey?: string;
  gridModal?: any;
  ws?: WsDef;
  input?: any;
  confirm?: any;
  redirect?: any;
  formKey?: string;
  fileName?: string;
  path?: string;
  displayType?: 'menu' | 'action';
  actions?: ActionDef[];
  confirmMessage?: string;
  confirmMessageKey?: string;
  redirectTo?: string;
  redirectToSuccess?: string;
}
