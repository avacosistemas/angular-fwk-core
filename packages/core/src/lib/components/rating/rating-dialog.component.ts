import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RatingComponent } from './rating.component';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { I18nService } from '../../services/i18n-service/i18n.service';

export interface RatingDialogData {
  maxStars?: number;
  title?: string;
  message?: string;
  subtitle?: string;
  showComment?: boolean;
  commentLabel?: string;
  commentPlaceholder?: string;
}

export interface RatingDialogResult {
  rating: number;
  comentarios?: string;
}

@Component({
  selector: 'fwk-rating-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    RatingComponent,
    TranslatePipe
  ],
  template: `
    <div class="flex flex-col p-6 max-w-lg w-full">
      <div class="flex flex-col items-center justify-center text-center gap-1.5 mb-2">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 m-0">
          {{ title }}
        </h2>
        <span *ngIf="subtitle" class="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {{ subtitle }}
        </span>
      </div>

      <div class="flex flex-col justify-center items-center gap-4 my-2">
        <div *ngIf="message" [innerHTML]="message" class="text-sm sm:text-base text-center text-slate-600 dark:text-slate-300 max-w-md leading-relaxed"></div>
        
        <div class="flex justify-center w-full py-1">
          <fwk-rating [maxStars]="maxStars" [(value)]="rating"></fwk-rating>
        </div>

        <div *ngIf="showComment" class="w-full mt-2">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>{{ commentLabel || ('rating_dialog_comment_label' | translate) }}</mat-label>
            <textarea
              matInput
              rows="3"
              [(ngModel)]="comentarios"
              [placeholder]="commentPlaceholder || ('rating_dialog_comment_placeholder' | translate)"
            ></textarea>
          </mat-form-field>
        </div>
      </div>

      <div class="flex items-center justify-center gap-3 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button mat-button class="!rounded-full !px-6" (click)="onCancel()">
          {{ 'rating_cancel_button' | translate }}
        </button>
        <button
          mat-flat-button
          color="accent"
          class="!rounded-full !px-8 shadow-xs"
          [disabled]="rating === 0"
          (click)="onSubmit()"
        >
          {{ 'rating_accept_button' | translate }}
        </button>
      </div>
    </div>
  `
})
export class RatingDialogComponent {
  rating = 0;
  comentarios = '';
  maxStars = 5;
  title = '';
  message = '';
  subtitle = '';
  showComment = false;
  commentLabel = '';
  commentPlaceholder = '';

  private i18nService = inject(I18nService);

  constructor(
    public dialogRef: MatDialogRef<RatingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RatingDialogData
  ) {
    if (data?.maxStars) {
      this.maxStars = data.maxStars;
    }
    this.title = data?.title || this.i18nService.translate('rating_dialog_title');
    this.message = data?.message || this.i18nService.translate('rating_dialog_message');
    this.subtitle = data?.subtitle || '';
    this.showComment = !!data?.showComment;
    this.commentLabel = data?.commentLabel || '';
    this.commentPlaceholder = data?.commentPlaceholder || '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    const result: RatingDialogResult = {
      rating: this.rating,
      comentarios: this.showComment ? this.comentarios : undefined
    };
    this.dialogRef.close(result);
  }
}
