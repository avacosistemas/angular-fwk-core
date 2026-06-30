import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../pipe/translate.pipe';

@Component({
  selector: 'fwk-rating',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, TranslatePipe],
  template: `
    <ng-container *ngIf="element; else interactiveMode">
      <div class="flex items-center justify-center w-full gap-1">
        <ng-container *ngIf="value > 0; else noRatingBlock">
          <div class="flex items-center text-amber-500">
            <mat-icon
              *ngFor="let star of stars"
              [svgIcon]="star <= value ? 'heroicons_solid:star' : 'heroicons_outline:star'"
              class="!w-5 !h-5 min-w-5 min-h-5 text-lg"
              [ngClass]="{
                'text-amber-500': star <= value,
                'text-gray-300 dark:text-gray-600': star > value
              }"
            ></mat-icon>
          </div>
        </ng-container>
        
        <ng-template #noRatingBlock>
          <ng-container *ngIf="columnActions && columnActions.length > 0; else showSinValorar">
            <div class="w-full flex justify-center gap-2">
              <button
                *ngFor="let act of columnActions"
                [ngClass]="getActionColorClasses(act)"
                class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-150"
                (click)="onActionClick(act, $event)"
              >
                <mat-icon *ngIf="act.icon" [svgIcon]="act.icon" class="!w-3 !h-3"></mat-icon>
                <span>{{ act.actionName }}</span>
              </button>
            </div>
          </ng-container>
          <ng-template #showSinValorar>
            <span class="w-full text-center text-gray-400 dark:text-gray-500 text-sm italic">
              {{ 'grid_rating_unrated' | translate:null:dictionaryName }}
            </span>
          </ng-template>
        </ng-template>
      </div>
    </ng-container>

    <ng-template #interactiveMode>
      <div class="w-full flex items-center justify-center gap-2">
        <mat-icon
          *ngFor="let star of stars"
          [svgIcon]="star <= (hoveredValue || value) ? 'heroicons_solid:star' : 'heroicons_outline:star'"
          [matTooltip]="getTooltip(star)"
          matTooltipPosition="above"
          (mouseenter)="onMouseEnter(star)"
          (mouseleave)="onMouseLeave()"
          (click)="onClick(star)"
          class="cursor-pointer transition-colors duration-150 !w-10 !h-10 text-4xl"
          [ngClass]="{
            'text-amber-500': star <= (hoveredValue || value),
            'text-gray-300 dark:text-gray-600': star > (hoveredValue || value)
          }"
        ></mat-icon>
      </div>
    </ng-template>
  `
})
export class RatingComponent {
  @Input() value = 0;
  @Input() maxStars = 5;
  @Input() tooltips: string[] = ['Malo', 'Regular', 'Bueno', 'Muy Bueno', 'Excelente'];
  @Input() element?: any;
  @Input() columnDef?: any;
  @Input() columnActions: any[] = [];
  @Input() dictionaryName = 'app';
  
  @Output() valueChange = new EventEmitter<number>();
  @Output() onActionTriggered = new EventEmitter<{ action: any, element: any, event: MouseEvent }>();

  hoveredValue = 0;

  get stars(): number[] {
    return Array.from({ length: this.maxStars }, (_, i) => i + 1);
  }

  getTooltip(star: number): string {
    return this.tooltips && this.tooltips[star - 1] ? this.tooltips[star - 1] : '';
  }

  onMouseEnter(star: number): void {
    this.hoveredValue = star;
  }

  onMouseLeave(): void {
    this.hoveredValue = 0;
  }

  onClick(star: number): void {
    this.value = star;
    this.valueChange.emit(this.value);
  }

  onActionClick(action: any, event: MouseEvent): void {
    this.onActionTriggered.emit({ action, element: this.element, event });
  }

  getActionColorClasses(action: any): string {
    const type = action.type || action.color || 'primary';
    switch (type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/40';
      case 'warn':
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/40';
      case 'error':
      case 'danger':
        return 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40';
      case 'info':
      case 'primary':
        return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-950/40';
      case 'accent':
        return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/40';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200/50 dark:border-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-900/40';
    }
  }
}
