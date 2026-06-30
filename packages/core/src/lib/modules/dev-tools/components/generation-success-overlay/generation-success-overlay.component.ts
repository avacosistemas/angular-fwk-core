import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

@Component({
    selector: 'fwk-generation-success-overlay',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe],
    template: `
    <div class="fixed inset-0 bg-card/80 dark:bg-gray-900 z-999 flex items-center justify-center backdrop-blur-sm">
      <div class="p-8">
        <div class="flex flex-col items-center p-8 rounded-2xl shadow-2xl bg-base-200 text-center max-w-md bg-white dark:bg-gray-950 sticky top-0 bottom-0 left-0 right-0">
          <mat-icon class="icon-size-24 text-green-500" svgIcon="heroicons_solid:check-badge"></mat-icon>
          <h2 class="text-2xl font-semibold mt-4">{{ message }}</h2>
          <p class="text-secondary mt-2">
            {{ 'dev_tools_gen_success_subtitle' | translate }}
          </p>
          <mat-progress-spinner [diameter]="32" mode="indeterminate" class="mt-6"></mat-progress-spinner>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationSuccessOverlayComponent {
    @Input() message: string = '¡Generado con éxito!';
}