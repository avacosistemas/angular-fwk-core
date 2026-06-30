import { Component, Inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
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
        color?: 'primary' | 'accent' | 'warn' | 'basic' | 'info' | 'success';
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

    private mergeWithDefaults(data: QuestionModalData): QuestionModalData {
        const defaults: QuestionModalData = {
            title: '',
            message: '',
            onSubmit: () => { },
            icon: {
                show: true,
                name: 'heroicons_outline:question-mark-circle',
                color: 'warn'
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