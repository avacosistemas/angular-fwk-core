import { Injectable } from '@angular/core';
import { CONTROL_TYPE } from '../../model/dynamic-form/dynamic-field';
import { MY_FORMATS } from '../dynamic-form/form.validator.service';
import { parse, isEqual, isBefore, isAfter, isSameDay } from 'date-fns';

@Injectable({
  providedIn: 'root' 
})
export class FilterService {

    public totalReg: number = 0;

    private convertValue(value: any, field: any): any {
        if (value === undefined || value === null || value === '') {
            return value;
        }

        if (field.controlType === CONTROL_TYPE.Datepicker) {
            const format = field.options?.format || MY_FORMATS.parse.dateInput;
            return parse(value, format, new Date());
        }

        return value;
    }

    filter(entityValue: any, filterValue: any, filterType: FILTER_TYPE, fieldDef: any): boolean {
        if (filterType === FILTER_TYPE.HAS_VALUE) {
            return this.filterHasValue(entityValue);
        }

        if (filterValue === null || filterValue === undefined || String(filterValue).length === 0) {
            return true;
        }

        if (entityValue === null || entityValue === undefined) {
            return false;
        }

        const convertedEntityValue = this.convertValue(entityValue, fieldDef);
        const convertedFilterValue = this.convertValue(filterValue, fieldDef);

        switch (filterType) {
            case FILTER_TYPE.LIKE:
                return this.filterIncludes(convertedEntityValue, convertedFilterValue);
            case FILTER_TYPE.EQUALS:
                return this.filterEquals(convertedEntityValue, convertedFilterValue);
            case FILTER_TYPE.NOTEQUALS:
                return !this.filterEquals(convertedEntityValue, convertedFilterValue);
            case FILTER_TYPE.LESS_EQUALS:
                return this.filterLessEquals(convertedEntityValue, convertedFilterValue);
            case FILTER_TYPE.GREATER_EQUALS:
                return this.filterGreaterEquals(convertedEntityValue, convertedFilterValue);
            case FILTER_TYPE.LESS:
                return this.filterLess(convertedEntityValue, convertedFilterValue);
            case FILTER_TYPE.GREATER:
                return this.filterGreater(convertedEntityValue, convertedFilterValue);
            default:
                console.warn('filterType -> ' + filterType + ' no existe...');
                return false;
        }
    }

    private isDate(value: any): value is Date {
        return value instanceof Date && !isNaN(value.valueOf());
    }

    private filterEquals(valueA: any, valueB: any): boolean {
        if (this.isDate(valueA) && this.isDate(valueB)) {
            return isSameDay(valueA, valueB);
        }
        if (typeof valueA === 'boolean' || typeof valueB === 'boolean') {
            return Boolean(valueA) === Boolean(valueB);
        }
        return valueA == valueB;
    }

    private filterGreaterEquals(valueA: any, valueB: any): boolean {
        if (this.isDate(valueA) && this.isDate(valueB)) {
            return isEqual(valueA, valueB) || isAfter(valueA, valueB);
        }
        return valueA >= valueB;
    }

    private filterLessEquals(valueA: any, valueB: any): boolean {
        if (this.isDate(valueA) && this.isDate(valueB)) {
            return isEqual(valueA, valueB) || isBefore(valueA, valueB);
        }
        return valueA <= valueB;
    }

    private filterLess(valueA: any, valueB: any): boolean {
        if (this.isDate(valueA) && this.isDate(valueB)) {
            return isBefore(valueA, valueB);
        }
        return valueA < valueB;
    }

    private filterGreater(valueA: any, valueB: any): boolean {
        if (this.isDate(valueA) && this.isDate(valueB)) {
            return isAfter(valueA, valueB);
        }
        return valueA > valueB;
    }

    private filterHasValue(value: any): boolean {
        return value !== null && value !== undefined && value !== '';
    }

    private filterIncludes(entityValue: any, filterValue: any): boolean {
        const valA = String(entityValue).toLowerCase();
        const valB = String(filterValue).toLowerCase();
        return valA.includes(valB);
    }
}

export const enum FILTER_TYPE {
    LIKE = 'LIKE',
    EQUALS = 'EQUALS',
    NOTEQUALS = 'NOTEQUALS',
    LESS_EQUALS = 'LESS-EQUALS',
    LESS = 'LESS',
    GREATER_EQUALS = 'GREATER-EQUALS',
    GREATER = 'GREATER',
    HAS_VALUE = 'HAS-VALUE',
}