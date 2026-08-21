import { ValidationDef } from '../../services/dynamic-form/form.validator.service';
import { DynamicFieldOptions } from './dynamic-field-options.interface';

export const LABEL = 'label';
export const EMAIL = 'email';
export const TEXTBOX = 'textbox';
export const PASSWORD: any = 'password';
export const HIDDEN: any = 'hidden';
export const NUMBER = 'number';
export const AUTOCOMPLETE: any = 'autocomplete';
export const AUTOCOMPLETE_DESPLEGABLE: any = 'autocomplete-desplegable';
export const SELECT: any = 'select';
export const DATEPICKER: any = 'datepicker';
export const DATETIMEPICKER: any = 'datetimepicker';
export const TIMEPICKER: any = 'timepicker';
export const CHECKBOX: any = 'checkbox';
export const HEADER: any = 'header';
export const TEXTAREA: any = 'textarea';
export const PICKLIST: any = 'pick-list';
export const SIMPLEPICKLIST: any = 'simple-pick-list';
export const CHIP_LIST: any = 'chip_list';
export const FILE: any = 'file';
export const RADIO_BUTTON = 'radio-button';
export const ICON_PICKER = 'icon-picker';
export const HTML_EDITOR = 'html_editor';
export const HTML = 'HTML';
export const DISCLAIMER = 'DISCLAIMER';
export const FLOAT = 'FLOAT';
export const COLOR_PICKER = 'COLOR_PICKER';
export const TAGS = 'TAGS';
export const URL_INPUT = 'URL_INPUT';
export const IMAGE_PREVIEW = 'IMAGE_PREVIEW';
export const IMAGE_PREVIEW_SRC = 'IMAGE_PREVIEW_SRC';
export const DATE_READ = 'DATE_READ';
export const DATE_TIME_READ = 'DATE_TIME_READ';
export const ALERT = 'alert';
export const IMAGE_CROPPER = 'image_cropper';

export enum CONTROL_TYPE {
  DateRead = 'date_read',
  DateTimeRead = 'date_time_read',
  Email = 'email',
  Textbox = 'textbox',
  Password = 'password',
  Hidden = 'hidden',
  Number = 'number',
  Float = 'float',
  Autocomplete = 'autocomplete',
  AutocompleteDesplegable = 'autocomplete-desplegable',
  Select = 'select',
  Datepicker = 'datepicker',
  Datetimepicker = 'datetimepicker',
  Timepicker = 'timepicker',
  Checkbox = 'checkbox',
  Header = 'header',
  Textarea = 'textarea',
  Picklist = 'pick-list',
  SimplePicklist = 'simple-pick-list',
  ChipList = 'chip_list',
  File = 'file',
  RadioButton = 'radio-button',
  HtmlEditor = 'html_editor',
  Html = 'HTML',
  Disclaimer = 'DISCLAIMER',
  ColorPicker = 'color_picker',
  Tags = 'tags',
  UrlInput = 'url_input',
  IconPicker = 'icon-picker',
  ImagePreview = 'image_preview',
  ImagePreviewSrc = 'image_preview_src',
  Label = 'label',
  Alert = 'alert',
  ImageCropper = 'image_cropper',
  Container = 'container',
  Group = 'group'
}


export enum ControlTypeEnum {
  dateRead = 'DATE_READ',
  dateTimeRead = 'DATE_TIME_READ',
  email = 'EMAIL',
  textbox = 'TEXTBOX',
  password = 'PASSWORD',
  hidden = 'HIDDEN',
  number = 'NUMBER',
  float = 'FLOAT',
  autocomplete = 'AUTOCOMPLETE',
  autocomplete_desplegable = 'AUTOCOMPLETE-DESPLEGABLE',
  select = 'SELECT',
  datepicker = 'DATEPICKER',
  datetimepicker = 'DATETIMEPICKER',
  timepicker = 'TIMEPICKER',
  checkbox = 'CHECKBOX',
  header = 'HEADER',
  textarea = 'TEXTAREA',
  picklist = 'PICKLIST',
  simplepicklist = 'SIMPLEPICKLIST',
  file = 'FILE',
  radio_button = 'RADIO-BUTTON',
  html = 'HTML',
  html_ditor = 'HTML_EDITOR',
  color_picker = 'color_picker',
  tags = 'tags',
  url_input = 'url_input',
  image_preview = 'image_preview',
  image_preview_src = 'image_preview_src',
  label = "label",
  alert = "ALERT",
  image_cropper = "IMAGE_CROPPER"
}

export class DynamicField<T> {
  key: string;
  labelKey?: string;
  id?: boolean;

  controlType: CONTROL_TYPE | string;
  mappingQuerystring?: boolean;
  value?: T;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  options?: DynamicFieldOptions;
  apiOptions?: any;
  maxLength?: any;
  minLength?: any;
  minValue?: any;
  maxValue?: any;
  length?: any;
  validation?: any;
  validations?: ValidationDef[];
  filterType?: any;
  requiredMessage?: string;
  maxLengthMessage?: string;
  minValueMessage?: string;
  maxValueMessage?: string;
  lengthMessage?: string;
  cssClass?: string;
  colSpan?: number; 
  fields?: DynamicField<any>[]; 

  readonly?: boolean;
  showPreview?: boolean;
  icon?: string;
  iconOpenUrl?: string;
  fromSession?: boolean;

  // Deprecated
  type?: string;
  order?: number;
  conditions?: any;
  formatType?: string;
  lengthErrorMsgKey?: string;

  constructor(options: {
    value?: T,
    key?: string,
    label?: string,
    required?: boolean,
    order?: number,
    controlType?: string,
    cssClass?: string
  } = {}) {
    this.value = options.value;
    this.key = options.key || '';
    this.label = options.label || '';
    this.required = !!options.required;
    this.order = options.order === undefined ? 1 : options.order;
    this.controlType = options.controlType || '';
    this.cssClass = options.cssClass || '';
  }
}