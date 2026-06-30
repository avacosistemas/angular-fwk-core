export const GEN_CONDITION_IF = {
  changeValue: 'change_value',
};
export enum CONDITION_COMPARE {
  LIKE = 'LIKE',
  EQUALS = 'EQUALS',
  LESS = 'LESS',
  LESS_EQUALS = 'LESS-EQUALS',
  GREATER = 'GREATER',
  GREATER_EQUALS = 'GREATER-EQUALS',
  HAS_VALUE = 'HAS-VALUE',
}
export class DynamicFieldConditionIf{
  key?: string;
  value?: any;
  compare?: string;
  toField?: string;
  group?: DynamicFieldConditionIf[];
  condition?: string;
  avoidThenOnValueNull?: boolean;
}
