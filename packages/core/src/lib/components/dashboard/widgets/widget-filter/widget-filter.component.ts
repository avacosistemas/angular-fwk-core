import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { DashboardFilterOption } from '../../../../model/component-def/dashboard-def';

@Component({
  selector: 'fwk-widget-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule
  ],
  template: `
    <div class="flex items-center gap-2 ml-auto -mt-2 -mb-5">
        <mat-form-field *ngIf="showDatePicker" appearance="outline" subscriptSizing="dynamic" class="min-w-[250px]">
            <mat-date-range-input [formGroup]="dateRangeForm" [rangePicker]="picker">
                <input matStartDate formControlName="start" placeholder="Desde">
                <input matEndDate formControlName="end" placeholder="Hasta">
            </mat-date-range-input>
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-date-range-picker #picker></mat-date-range-picker>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-select [formControl]="filterControl">
                <mat-option *ngFor="let option of options" [value]="option.value">
                    {{ option.viewValue }}
                </mat-option>
            </mat-select>
        </mat-form-field>
    </div>
  `
})
export class WidgetFilterComponent implements OnInit {
  @Input() options: DashboardFilterOption[] = [];
  @Input() initialValue: string = 'all';
  @Output() filterChange = new EventEmitter<any>();

  filterControl: FormControl;
  dateRangeForm: FormGroup;
  showDatePicker = false;

  ngOnInit(): void {
    this.filterControl = new FormControl(this.initialValue);
    this.dateRangeForm = new FormGroup({
      start: new FormControl(null),
      end: new FormControl(null)
    });

    this.checkShowDatePicker(this.initialValue);

    this.filterControl.valueChanges.subscribe((value: string) => {
      this.checkShowDatePicker(value);
      if (value !== 'PERIODO') {
        this.filterChange.emit(value);
      }
    });

    this.dateRangeForm.valueChanges.subscribe(value => {
      if (this.showDatePicker && value.start && value.end) {
        this.filterChange.emit({
          type: 'date-range',
          value: value
        });
      }
    });
  }

  private checkShowDatePicker(value: string): void {
    this.showDatePicker = value === 'PERIODO';
  }
}