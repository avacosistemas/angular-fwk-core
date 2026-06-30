import { Component, ChangeDetectionStrategy, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

export interface BehaviorDefinitionModalData {
    behaviors: any[];
    availableFields: { key: string, label: string }[];
    triggerFieldKey: string;
}

@Component({
    selector: 'fwk-behavior-definition-modal',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatSelectModule, MatCheckboxModule, MatTooltipModule, TranslatePipe
    ],
    templateUrl: './behavior-definition-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BehaviorDefinitionModalComponent {
    private _fb = inject(FormBuilder);

    form: FormGroup;
    behaviorComparators = ['EQUALS', 'NOTEQUALS', 'GREATER', 'LESS', 'HAS_VALUE', 'LIKE'];
    controlTypeChoices = ['textbox', 'number', 'textarea', 'checkbox', 'select', 'datepicker', 'hidden'];

    get behaviorsArray(): FormArray {
        return this.form.get('behaviors') as FormArray;
    }

    constructor(
        public dialogRef: MatDialogRef<BehaviorDefinitionModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: BehaviorDefinitionModalData
    ) {
        this.form = this._fb.group({
            behaviors: this._fb.array(this.data.behaviors.map(b => this.createBehaviorGroup(b)))
        });
    }

    createBehaviorGroup(data?: any): FormGroup {
        return this._fb.group({
            fieldKey: [this.data.triggerFieldKey],
            condition: this._fb.group({
                if: this._fb.array(data?.condition?.if?.map(c => this.createConditionGroup(c)) || [this.createConditionGroup()]),
                then: this._fb.array(data?.condition?.then?.map(t => this.createThenElseGroup(t)) || []),
            })
        });
    }

    createConditionGroup(data?: any): FormGroup {
        const compareValue = data?.compare?.startsWith('%%FILTER_TYPE.') ? data.compare.split('.')[1].replace('%%', '') : (data?.compare || 'EQUALS');

        return this._fb.group({
            key: [data?.key || '', Validators.required],
            compare: [compareValue, Validators.required],
            value: [data?.value ?? '']
        });
    }

    createThenElseGroup(data?: any): FormGroup {
        return this._fb.group({
            key: [data?.key || '', Validators.required],
            required: [data?.required || false],
            disabled: [data?.disabled || false],
            controlType: [data?.controlType || ''],
            value: [data?.value ?? '']
        });
    }

    getBehaviorConditions(behaviorControl: AbstractControl): FormArray {
        return behaviorControl.get('condition.if') as FormArray;
    }

    getBehaviorThen(behaviorControl: AbstractControl): FormArray {
        return behaviorControl.get('condition.then') as FormArray;
    }

    addBehavior(): void {
        this.behaviorsArray.push(this.createBehaviorGroup());
    }

    removeBehavior(index: number): void {
        this.behaviorsArray.removeAt(index);
    }

    addCondition(behaviorControl: AbstractControl): void {
        this.getBehaviorConditions(behaviorControl).push(this.createConditionGroup());
    }

    removeCondition(behaviorControl: AbstractControl, index: number): void {
        this.getBehaviorConditions(behaviorControl).removeAt(index);
    }

    addThen(behaviorControl: AbstractControl): void {
        this.getBehaviorThen(behaviorControl).push(this.createThenElseGroup());
    }

    removeThen(behaviorControl: AbstractControl, index: number): void {
        this.getBehaviorThen(behaviorControl).removeAt(index);
    }

    onSave(): void {
        if (this.form.invalid) {
            return;
        }
        const rawValue = this.form.getRawValue();

        const processedBehaviors = rawValue.behaviors.map(behavior => {
            if (behavior.condition && behavior.condition.if) {
                behavior.condition.if.forEach(condition => {
                    if (condition.compare) {
                        condition.compare = `%%FILTER_TYPE.${condition.compare}%%`;
                    }
                });
            }
            return behavior;
        });

        this.dialogRef.close(processedBehaviors);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}