import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RatingComponent } from './rating.component';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { I18nService } from '../../services/i18n-service/i18n.service';

@Component({
  selector: 'fwk-rating-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, RatingComponent, TranslatePipe],
  template: `
    <div class="flex flex-col p-6">
      <div mat-dialog-title class="flex items-center justify-center">
        <span class="text-3xl font-semibold">{{ title }}</span>
      </div>

      <div mat-dialog-content class="flex flex-col justify-center gap-6">
        <div [innerHTML]="message" class="text-lg text-center"></div>
        <div class="flex justify-center w-full">
          <fwk-rating [maxStars]="maxStars" [(value)]="rating"></fwk-rating>
        </div>
      </div>

      <div mat-dialog-actions class="flex items-center justify-center space-x-2">
        <button mat-button (click)="onCancel()">
          {{ 'rating_cancel_button' | translate }}
        </button>
        <button mat-flat-button color="accent" [disabled]="rating === 0" (click)="onSubmit()">
          {{ 'rating_accept_button' | translate }}
        </button>
      </div>
    </div>
  `
})
export class RatingDialogComponent {
  rating = 0;
  maxStars = 5;
  title = '';
  message = '';
  private i18nService = inject(I18nService);

  constructor(
    public dialogRef: MatDialogRef<RatingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data?.maxStars) {
      this.maxStars = data.maxStars;
    }
    this.title = data?.title || this.i18nService.translate('rating_dialog_title');
    this.message = data?.message || this.i18nService.translate('rating_dialog_message');
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.dialogRef.close(this.rating);
  }
}
