import { Injectable } from '@angular/core';
import { DynamicFieldConditionIf } from '../../model/dynamic-form/dynamic-field-condition-if';
import { FILTER_TYPE } from '../filter-service/filter.service';

@Injectable({
  providedIn: 'root'
})
export class ExpressionService {

    evaluate(condition: DynamicFieldConditionIf, entity: Record<string, any>): boolean {
        if (!condition) {
            return true;
        }
        if (!entity) {
            console.error('La entidad para evaluar la condición es nula o indefinida.', { condition });
            return false;
        }

        try {
            const valueA = condition.key ? entity[condition.key] : undefined;
            const valueB = condition.value !== undefined 
                ? condition.value 
                : (condition.toField ? entity[condition.toField] : undefined);

            const compare = condition.compare?.toUpperCase() ?? FILTER_TYPE.EQUALS;

            switch (compare) {
                case FILTER_TYPE.EQUALS:
                    return valueA == valueB;
                case FILTER_TYPE.NOTEQUALS:
                    return valueA != valueB;
                case FILTER_TYPE.GREATER_EQUALS:
                    return Number(valueA) >= Number(valueB);
                case FILTER_TYPE.GREATER:
                    return Number(valueA) > Number(valueB);
                case FILTER_TYPE.LESS_EQUALS:
                    return Number(valueA) <= Number(valueB);
                case FILTER_TYPE.LESS:
                    return Number(valueA) < Number(valueB);
                case FILTER_TYPE.LIKE:
                    if (valueA === null || valueA === undefined || valueB === null || valueB === undefined) {
                        return valueA === valueB;
                    }
                    return String(valueA).toLowerCase().includes(String(valueB).toLowerCase());
                default:
                    console.warn(`Tipo de comparación no reconocido: ${compare}`);
                    return false;
            }
        } catch (e) {
            console.error('Error al evaluar la condición:', e);
            const conditionStr = JSON.stringify(condition);
            const entityStr = JSON.stringify(entity);
            throw new Error(`Error al evaluar la condición ${conditionStr} para la entidad ${entityStr}`);
        }
    }
}