import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

@Component({
  selector: 'fwk-widget-error-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, TranslatePipe],
  template: `
    <div class="flex flex-col items-center justify-center text-center p-4 h-full">
      <mat-icon class="icon-size-12 text-warn-500">heroicons_outline:exclamation-triangle</mat-icon>
      <p class="mt-2 font-semibold text-lg">{{ title }}</p>
      <p class="mt-1 text-sm text-secondary">{{ message }}</p>
      <button mat-stroked-button color="warn" class="mt-6" (click)="retry.emit()">
        {{ 'widget_error_retry_button' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetErrorStateComponent {
  @Input() title: string;
  @Input() message: string;
  @Output() retry = new EventEmitter<void>();
}