import { Injector } from '@angular/core';
import { ComponentDef } from './component-def';
import { FormsCrudDef } from './form-crud-def';
import { GridDef } from './grid-def';
import { ActionDef } from './action-def';
import { DisplayActionsCondition } from '../display-actions-condition';
import { DynamicFieldConditionIf } from '../dynamic-form/dynamic-field-condition-if';
import { WsDef } from '../ws-def';

export class CrudDef extends ComponentDef {
  grid?: GridDef;
  /* 
    Estructura deprecada usar formsDef -> forms esta solo disponible para el componente visual crud
  */
  backButton?: boolean;
  urlHelp?: string;
  forms?: FormsCrudDef;
  forceGetDetail?: boolean;
  crudActions?: ActionDef[];
  displayGlobalActions?: DisplayActionsCondition[];
  initWs?: WsDef;
  filterInMemory?: boolean;
  readCondition?: DynamicFieldConditionIf;
  pagination?: {
    page: number,
    pageSize: number
  };
  cancelInitSearch?: boolean;
  serverPagination?: boolean;
  initFilter?: boolean;
  openLink?: string;
  openLinkTitle?: string;
  downloadBoleta?: boolean;
  exportCsv?: {
    type?: 'none' | 'client' | 'server';
    csvExportFileName: string,
    ws?: string
  };
  exportFile?: {
    ws: string;
    fileName?: string;
  };
  // Deprecado
  searchFields?: any;
  initSearch?: boolean;
  wsGetDetail?: string;
  
  mock?: boolean;
  mockData?: any;
  onAddSuccess?: (entity: any, response: any, injector: Injector) => void;
  onUpdateSuccess?: (entity: any, response: any, injector: Injector) => void;

  deniedCreateAlerts?: {
    messageKey: string;
    conditionKey?: string;
    conditionValue?: any;
    expression?: DynamicFieldConditionIf;
    paramKey?: string;
    type?: 'info' | 'warning' | 'error';
  }[];

  alerts?: {
    messageKey: string;
    conditionKey?: string;
    conditionValue?: any;
    expression?: DynamicFieldConditionIf;
    paramKey?: string;
    type?: 'info' | 'warning' | 'error';
  }[];

  generalAlerts?: {
    messageKey: string;
    conditionKey?: string;
    conditionValue?: any;
    expression?: DynamicFieldConditionIf;
    paramKey?: string;
    type?: 'info' | 'warning' | 'error';
  }[];

  clusterConfig?: any;

  confirmSave?: {
    titleKey?: string;
    title?: string;
    messageKey?: string;
    message?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    confirmButtonKey?: string;
    cancelButtonKey?: string;
  };

  successModal?: {
    titleKey?: string;
    title?: string;
    messageKey?: string;
    message?: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    closeButtonKey?: string;
  };
}
