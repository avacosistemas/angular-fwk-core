import { WsDef } from '../ws-def';
import { I18n } from '../i18n';
import { NavigationDef } from './navigation-def';
import { SecurityDef } from './security-def';
import { FormsDef } from './form-def';
import { ActionDef } from './action-def';
import { DashboardLayoutDef } from './dashboard-def';

export class ComponentDef {
  name!: string;
  i18n!: I18n;
  template?: string;

  formsDef?: FormsDef;
  ws?: WsDef;
  navigation?: NavigationDef;
  security?: SecurityDef;
  styleUrl?: string;
  test?: any;
  actions?: ActionDef[];
  dialogs?: any;
  dialogConfig?: any;
  dashboardConfig?: DashboardLayoutDef; 
}