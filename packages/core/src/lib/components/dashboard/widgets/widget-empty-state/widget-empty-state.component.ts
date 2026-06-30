import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'fwk-widget-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex flex-col items-center justify-center text-center p-4 h-full text-secondary">
      <mat-icon class="icon-size-12">heroicons_outline:chart-pie</mat-icon>
      <p class="mt-2 font-medium">{{ title }}</p>
      <p class="mt-1 text-sm">{{ message }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetEmptyStateComponent {
  @Input() title: string = 'Sin datos';
  @Input() message: string = 'No hay información disponible para mostrar.';
}