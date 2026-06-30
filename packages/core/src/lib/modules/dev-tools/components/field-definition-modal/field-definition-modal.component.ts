import { Component, ChangeDetectionStrategy, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DynamicField } from '../../../../model/dynamic-form/dynamic-field';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

export interface FieldDefinitionModalData {
    fields: DynamicField<any>[];
    allAvailableFields: { key: string, label: string }[];
    actionName: string;
}

@Component({
    selector: 'fwk-field-definition-modal',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatDialogModule, MatTableModule, MatFormFieldModule,
        MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatCheckboxModule, MatTooltipModule, TranslatePipe
    ],
    templateUrl: './field-definition-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldDefinitionModalComponent {
    private _fb = inject(FormBuilder);
    
    form: FormGroup;
    dataSource = new MatTableDataSource<FormGroup>();
    displayedColumns: string[] = ['key', 'label', 'controlType', 'required', 'actions'];
    controlTypeChoices = ['textbox', 'number', 'textarea', 'email', 'password', 'datepicker', 'datetimepicker', 'checkbox', 'select', 'autocomplete', 'hidden'];

    get fieldsArray(): FormArray {
        return this.form.get('fields') as FormArray;
    }

    constructor(
        public dialogRef: MatDialogRef<FieldDefinitionModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: FieldDefinitionModalData
    ) {
        this.form = this._fb.group({
            fields: this._fb.array(this.data.fields.map(field => this.createFieldGroup(field)))
        });
        this.dataSource.data = this.fieldsArray.controls as FormGroup[];
    }

    createFieldGroup(field?: DynamicField<any>): FormGroup {
        return this._fb.group({
            key: [field?.key || '', Validators.required],
            label: [field?.label || '', Validators.required],
            controlType: [field?.controlType || 'textbox', Validators.required],
            required: [field?.required || false]
        });
    }

    addField(): void {
        const newFieldGroup = this.createFieldGroup();
        this.fieldsArray.push(newFieldGroup);
        this.dataSource.data = this.fieldsArray.controls as FormGroup[];
    }

    removeField(index: number): void {
        this.fieldsArray.removeAt(index);
        this.dataSource.data = this.fieldsArray.controls as FormGroup[];
    }

    onFieldKeyChange(fieldGroup: FormGroup, selectedKey: string): void {
        const existingField = this.data.allAvailableFields.find(f => f.key === selectedKey);
        if (existingField) {
            fieldGroup.get('label')?.setValue(existingField.label);
        }
    }

    onSave(): void {
        if (this.form.invalid) {
            return;
        }
        this.dialogRef.close(this.form.getRawValue().fields);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}