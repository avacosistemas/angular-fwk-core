import { Component, ChangeDetectionStrategy, inject, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../../../pipe/translate.pipe';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

export interface DatePickerModalData {
    initialDate: {
        day?: number;
        month?: number;
        year?: number;
        hour?: number;
        minute?: number;
    };
    withHourAndMin: boolean;
    title: string;
}

type PickerView = 'main' | 'day' | 'month' | 'year' | 'hour' | 'minute';

interface CalendarDay {
    day: number;
    isCurrentMonth: boolean;
}

@Component({
     selector: 'fwk-datepicker-modal',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatCheckboxModule, MatDividerModule, MatTooltipModule, TranslatePipe
    ],
    templateUrl: './datepicker-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerModalComponent implements OnInit {
    private _fb = inject(FormBuilder);

    form!: FormGroup;
    currentView: PickerView = 'main';

    months = Array.from({ length: 12 }, (_, i) => ({
        label: format(new Date(2000, i, 1), 'MMMM', { locale: es }),
        value: i + 1
    }));
    years = Array.from({ length: 11 }, (_, i) => 2020 + i);
    hours = Array.from({ length: 24 }, (_, i) => i);
    minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);
    calendarDays: CalendarDay[] = [];
    weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

    constructor(
        public dialogRef: MatDialogRef<DatePickerModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DatePickerModalData,
    ) {}

    ngOnInit(): void {
        const initial = this.data.initialDate;
        
        this.form = this._fb.group({
            day: [initial.day, [Validators.required, Validators.min(1), Validators.max(31)]],
            month: [initial.month, Validators.required],
            year: [initial.year, [Validators.required, Validators.min(1900), Validators.max(2100)]],
            hour: [initial.hour, [Validators.required, Validators.min(0), Validators.max(23)]],
            minute: [initial.minute, [Validators.required, Validators.min(0), Validators.max(59)]],
            useCurrentDateTime: [false]
        }, { validators: this.dateValidator() });
        
        if (!this.data.withHourAndMin) {
            this.form.get('hour')?.disable();
            this.form.get('minute')?.disable();
        }

        this.form.get('useCurrentDateTime')?.valueChanges.subscribe(useCurrent => {
            const fieldsToToggle = ['day', 'month', 'year', 'hour', 'minute'];
            fieldsToToggle.forEach(fieldName => {
                const control = this.form.get(fieldName);
                if (useCurrent) {
                    control?.disable();
                } else {
                    if (this.data.withHourAndMin || !['hour', 'minute'].includes(fieldName)) {
                        control?.enable();
                    }
                }
            });
        });

        this.generateCalendarDays();
        this.form.get('month')?.valueChanges.subscribe(() => this.generateCalendarDays());
        this.form.get('year')?.valueChanges.subscribe(() => this.generateCalendarDays());
    }

    changeView(view: PickerView): void {
        this.currentView = view;
    }

    getMonthName(monthValue: number): string {
        return this.months.find(m => m.value === monthValue)?.label || '';
    }

    selectValue(field: string, value: number | string): void {
        this.form.get(field)?.setValue(value);
        this.form.get(field)?.markAsDirty();
        if (field === 'month' || field === 'year') {
           this.form.updateValueAndValidity();
        }
        this.changeView('main');
    }

    selectDay(day: CalendarDay): void {
        if (!day.isCurrentMonth) return;
        this.selectValue('day', day.day);
    }
    
    generateCalendarDays(): void {
        const year = this.form.get('year')?.value;
        const month = (this.form.get('month')?.value ?? 0) - 1;
        if (year === null || month === null) return;

        const date = new Date(year, month, 1);
        const daysInMonth = getDaysInMonth(date);
        const firstDayOfMonth = startOfMonth(date);
        const startDayOfWeek = getDay(firstDayOfMonth); 

        const days: CalendarDay[] = [];
        const prevMonthDays = getDaysInMonth(new Date(year, month - 1));

        for (let i = startDayOfWeek; i > 0; i--) {
            days.push({ day: prevMonthDays - i + 1, isCurrentMonth: false });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrentMonth: true });
        }
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({ day: i, isCurrentMonth: false });
        }
        this.calendarDays = days;
    }
    
    dateValidator(): ValidatorFn {
        return (control: any): ValidationErrors | null => {
            const day = control.get('day')?.value;
            const month = control.get('month')?.value;
            const year = control.get('year')?.value;
            if (!day || !month || !year) return null;
            const daysInMonth = getDaysInMonth(new Date(year, month - 1));
            if (day > daysInMonth) {
                control.get('day')?.setErrors({ invalidDate: true });
                return { invalidDate: true };
            }
            if (control.get('day')?.hasError('invalidDate')) {
                control.get('day')?.setErrors(null);
            }
            return null;
        };
    }
    
    onSave(): void {
        const useCurrent = this.form.get('useCurrentDateTime')?.value;
        if (this.form.invalid && !useCurrent) {
            this.form.markAllAsTouched();
            return;
        }

        let resultDate: Date;
        if (useCurrent) {
            resultDate = new Date();
        } else {
            const formValue = this.form.getRawValue();
            resultDate = new Date(
                formValue.year ?? 0,
                (formValue.month ?? 1) - 1,
                formValue.day ?? 1,
                this.data.withHourAndMin ? (formValue.hour ?? 0) : 0,
                this.data.withHourAndMin ? (formValue.minute ?? 0) : 0
            );
        }
        this.dialogRef.close(resultDate);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}