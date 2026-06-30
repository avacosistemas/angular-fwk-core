import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'fwk-widget-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngSwitch]="type" class="animate-pulse flex flex-col w-full">
      
      <!-- Skeleton para STAT CARD -->
      <ng-container *ngSwitchCase="'stat'">
        <div class="flex flex-col items-center justify-center flex-auto">
            <div class="w-1/4 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div class="w-2/4 h-5 mt-2 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
      </ng-container>

      <!-- Skeleton para BAR Chart -->
      <ng-container *ngSwitchCase="'bar'">
        <div class="flex flex-col justify-between">
            <div class="w-3/5 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="flex items-end space-x-2 mt-4 flex-auto">
                <div class="h-1/4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-1/2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-3/4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-1/3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-5/6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-2/5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
        </div>
      </ng-container>

      <!-- Skeleton para LINE Chart -->
      <ng-container *ngSwitchCase="'line'">
        <div class="flex flex-col justify-between">
            <div class="w-3/5 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="flex items-end space-x-2 mt-4 flex-auto">
                <div class="h-1/4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-1/2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-3/4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-1/3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-5/6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-2/5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
        </div>
      </ng-container>

      <!-- Skeleton para PIE Chart -->
      <ng-container *ngSwitchCase="'pie'">
        <div class="flex flex-col items-center justify-center flex-auto">
            <div class="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div class="flex items-center justify-center space-x-4 mt-6">
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
        </div>
      </ng-container>

      <!-- Skeleton para DONUT Chart -->
      <ng-container *ngSwitchCase="'donut'">
        <div class="flex flex-col items-center justify-center flex-auto">
            <div class="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div class="flex items-center justify-center space-x-4 mt-6">
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
        </div>
      </ng-container>
      
      <!-- Skeleton para POLAR AREA Chart -->
      <ng-container *ngSwitchCase="'polarArea'">
        <div class="flex flex-col items-center justify-center flex-auto">
            <div class="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div class="flex items-center justify-center space-x-4 mt-6">
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
        </div>
      </ng-container>

      <!-- Skeleton por Defecto (similar a Bar) -->
      <ng-container *ngSwitchDefault>
         <div class="flex flex-col justify-between">
            <div class="w-3/5 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div class="flex items-end space-x-2 mt-4 flex-auto">
                <div class="h-1/4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-1/2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-3/4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-1/3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
        </div>
      </ng-container>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetSkeletonComponent {
  @Input() type: 'stat' | 'bar' | 'line' | 'pie' | 'donut' | 'polarArea' | 'default' = 'default';
}