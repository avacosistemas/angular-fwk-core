import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { DashboardFilterDef } from '../../../model/component-def/dashboard-def';
import { TranslatePipe } from '../../../pipe/translate.pipe';

@Component({
  selector: 'fwk-dashboard-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    TranslatePipe
  ],
  template: `
    <div class="flex flex-wrap gap-4 items-center">
      <ng-container *ngFor="let filter of filters">
        <!-- SELECT FILTER -->
        <mat-form-field *ngIf="filter.type === 'select'" appearance="outline" subscriptSizing="dynamic" class="min-w-[200px]">
          <mat-label>{{ filter.labelKey | translate:i18nName }}</mat-label>
          <mat-select [formControl]="getControl(filter.id)">
            <mat-option *ngFor="let opt of filter.options" [value]="opt.value">
              {{ opt.viewValue }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- DATE RANGE FILTER -->
        <mat-form-field *ngIf="filter.type === 'date-range'" appearance="outline" subscriptSizing="dynamic" class="min-w-[300px]">
          <mat-label>{{ filter.labelKey | translate:i18nName }}</mat-label>
          <mat-date-range-input [formGroup]="getDateRangeGroup(filter.id)" [rangePicker]="picker">
            <input matStartDate formControlName="start" [placeholder]="'dashboard_filter_from' | translate">
            <input matEndDate formControlName="end" [placeholder]="'dashboard_filter_to' | translate">
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker #picker></mat-date-range-picker>
        </mat-form-field>
      </ng-container>
    </div>
  `
})
export class DashboardFilterComponent implements OnInit {
  @Input() filters: DashboardFilterDef[] = [];
  @Input() i18nName: string = 'fwk';
  @Output() filterChange = new EventEmitter<any>();

  filterForm = new FormGroup({});

  ngOnInit(): void {
    this.filters.forEach(f => {
      if (f.type === 'select') {
        this.filterForm.addControl(f.id, new FormControl(f.defaultOption || 'all'));
      } else if (f.type === 'date-range') {
        const group = new FormGroup({
          start: new FormControl(f.defaultOption?.start || null),
          end: new FormControl(f.defaultOption?.end || null)
        });
        this.filterForm.addControl(f.id, group);
      }
    });

    this.filterForm.valueChanges.subscribe(value => {
      this.filterChange.emit(value);
    });
  }

  getControl(id: string): FormControl {
    return this.filterForm.get(id) as FormControl;
  }

  getDateRangeGroup(id: string): FormGroup {
    return this.filterForm.get(id) as FormGroup;
  }
}
