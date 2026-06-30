import { Type } from '@angular/core';
import { ComponentDef } from './component-def';
import { ActionDef } from './action-def';

export interface PageComponentDef extends ComponentDef {
    component: Type<any>;
    actions?: ActionDef[];
    backButton?: boolean;
    subtitleKey?: string;
}