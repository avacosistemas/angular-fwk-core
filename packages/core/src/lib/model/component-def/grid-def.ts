import { DisplayCondition } from './display-condition';
import { ActionDef } from './action-def';
import { DynamicFieldConditionIf } from '../dynamic-form/dynamic-field-condition-if';

export class GridDef {
    columnsDef!: ColumnDef[];
    displayedColumns!: string[];
    displayedColumnsCondition?: DisplayCondition[];
    displayedActionsCondition?: DisplayCondition[];
    selectCondition?: DynamicFieldConditionIf;

    key?: string;
    actionHeaderClass?: string;
    actionCellClass?: string;
    columnName?: string;
    sortAllColumns?: boolean;
    deleteAction?: boolean;
    actions?: ActionDef[];
    fromArrayField?: string;
    deleteTernaria?: boolean;
    columnsTernaria?: string[];
    groupActions?: boolean;

    deleteColumn?: any;
    titleKey?: string;
    title?: string;
}

export interface ColumnDef {
    columnDef: string;
    columnName?: string;
    columnNameKey: string;
    key?: boolean;
    columnType?: 'text' | 'date' | 'datehour' | 'number' | 'boolean' | string;

    fitContent?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    wrapText?: boolean;
    headerClass?: string;
    cellClass?: string;
    cellRender?: (element: any) => any;
    cellClassRender?: (element: any) => string;

    id?: boolean;
    sort?: {
        disabled?: boolean;
        type?: 'asc' | 'desc';
    };
    translate?: boolean;

    singleId?: boolean;
    multiId?: boolean;

    maxStars?: number;
    columnActions?: ActionDef[];
}