import { Component, Inject, ChangeDetectorRef, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, finalize } from 'rxjs';
import { TranslatePipe } from '../../pipe/translate.pipe';

export interface QuestionModalData {
    title: string;
    message: string;
    icon?: {
        show?: boolean;
        name?: string;
        color?: 'primary' | 'accent' | 'warn' | 'basic' | 'info' | 'success' | 'error';
    };
    actions?: {
        confirm?: {
            show?: boolean;
            label?: string;
            color?: 'primary' | 'accent' | 'warn';
        };
        cancel?: {
            show?: boolean;
            label?: string;
        };
    };
    onReject?: () => void;
    onSubmit: () => Observable<any> | void;
}

@Component({
     selector: 'fwk-question-modal-component',
    templateUrl: './question-modal.component.html',
    styleUrls: ['./question-modal.component.scss'],
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TranslatePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionModalComponent {

    data: QuestionModalData;
    isSubmitting: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<QuestionModalComponent>,
        @Inject(MAT_DIALOG_DATA) data: QuestionModalData,
        private _cdr: ChangeDetectorRef,
    ) {
        this.data = this.mergeWithDefaults(data);
    }

    getIconContainerClass(): string {
        const color = this.data.icon?.color || 'warn';
        switch (color) {
            case 'warn':
            case 'error':
                return 'bg-red-50 dark:bg-red-950/50 border-red-200/80 dark:border-red-900/80';
            case 'primary':
                return 'bg-blue-50 dark:bg-blue-950/50 border-blue-200/80 dark:border-blue-900/80';
            case 'accent':
                return 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/80 dark:border-indigo-900/80';
            case 'success':
                return 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/80 dark:border-emerald-900/80';
            case 'info':
                return 'bg-sky-50 dark:bg-sky-950/50 border-sky-200/80 dark:border-sky-900/80';
            default:
                return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200/80 dark:border-amber-900/80';
        }
    }

    getIconColorClass(): string {
        const color = this.data.icon?.color || 'warn';
        switch (color) {
            case 'warn':
            case 'error':
                return 'text-red-600 dark:text-red-400';
            case 'primary':
                return 'text-blue-600 dark:text-blue-400';
            case 'accent':
                return 'text-indigo-600 dark:text-indigo-400';
            case 'success':
                return 'text-emerald-600 dark:text-emerald-400';
            case 'info':
                return 'text-sky-600 dark:text-sky-400';
            default:
                return 'text-amber-600 dark:text-amber-400';
        }
    }

    private mergeWithDefaults(data: QuestionModalData): QuestionModalData {
        const isWarnOrError = data.icon?.color === 'warn' ||
                              data.icon?.color === 'error' ||
                              data.actions?.confirm?.color === 'warn';

        const defaultIconName = isWarnOrError
            ? 'heroicons_outline:exclamation-triangle'
            : 'heroicons_outline:question-mark-circle';

        const defaults: QuestionModalData = {
            title: '',
            message: '',
            onSubmit: () => { },
            icon: {
                show: true,
                name: defaultIconName,
                color: isWarnOrError ? 'warn' : 'primary'
            },
            actions: {
                confirm: {
                    show: true,
                    color: 'primary'
                },
                cancel: {
                    show: true
                }
            }
        };

        const finalData = {
            ...defaults,
            ...data,
            icon: {
                ...defaults.icon,
                ...data.icon
            },
            actions: {
                confirm: {
                    ...defaults.actions?.confirm,
                    ...data.actions?.confirm
                },
                cancel: {
                    ...defaults.actions?.cancel,
                    ...data.actions?.cancel
                }
            }
        };

        return finalData;
    }

    onReject(): void {
        if (this.data.onReject) {
            this.data.onReject();
        }
        this.dialogRef.close('rejected');
    }

    onSubmit(): void {
        if (this.data.onSubmit) {
            const result = this.data.onSubmit();

            if (result instanceof Observable) {
                this.isSubmitting = true;
                this._cdr.markForCheck();

                result.pipe(
                    finalize(() => {
                        this.isSubmitting = false;
                        this._cdr.markForCheck();
                        this.dialogRef.close('confirmed');
                    })
                ).subscribe();
            } else {
                this.dialogRef.close('confirmed');
            }
        } else {
            this.dialogRef.close('confirmed');
        }
    }
}