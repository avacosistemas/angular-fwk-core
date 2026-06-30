import { EventEmitter } from '@angular/core';
import { ActionDef } from './component-def/action-def';

export interface CustomPageComponent {
    onAction(action: ActionDef): void;
    actionStateChange?: EventEmitter<{ key: string, changes: Partial<ActionDef> }>;
}