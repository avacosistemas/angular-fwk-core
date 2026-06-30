import { Component, Input, OnInit, ViewEncapsulation, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BaseWidgetDirective } from '../../base-widget.directive';
import { WidgetFilterComponent } from '../widget-filter/widget-filter.component';
import { DashboardWidgetDef } from '../../../../model/component-def/dashboard-def';
import { WidgetSkeletonComponent } from '../widget-skeleton/widget-skeleton.component';
import { WidgetErrorStateComponent } from '../widget-error-state/widget-error-state.component';
import { WidgetEmptyStateComponent } from '../widget-empty-state/widget-empty-state.component';

@Component({
    selector: 'fwk-stat-card-widget',
    standalone: true,
    imports: [CommonModule, DecimalPipe, MatCardModule, MatIconModule, WidgetFilterComponent, WidgetSkeletonComponent, WidgetErrorStateComponent, WidgetEmptyStateComponent],
    template: `
        <div class="bg-card flex flex-auto flex-col overflow-hidden rounded-2xl p-6 shadow relative min-h-[120px]">
            <ng-container *ngIf="widgetDef?.isLoading; else content">
                <div class="relative inset-0 flex items-center justify-center h-full">
                    <fwk-widget-skeleton [type]="widgetDef.type" class="w-full"></fwk-widget-skeleton>
                </div>
            </ng-container>

            <ng-template #content>
                <ng-container *ngIf="!widgetDef.isLoading && widgetDef.hasError">
                    <div class="absolute inset-0 flex items-center justify-center p-4">
                        <fwk-widget-error-state 
                            [title]="'widget_error_title' | translate"
                            [message]="widgetDef.errorMessage"
                            (retry)="onRetry()">
                        </fwk-widget-error-state>
                    </div>
                </ng-container>

                <ng-container *ngIf="!widgetDef.hasError">
                    <div class="flex items-center justify-between z-10">
                        <div class="flex flex-col">
                            <div class="truncate text-secondary text-sm font-semibold uppercase tracking-wider">{{ widgetDef?.title }}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <fwk-widget-filter *ngIf="widgetDef?.filterConfig?.show"
                                [options]="widgetDef.filterConfig.options"
                                [initialValue]="widgetDef.filterConfig.defaultOption"
                                (filterChange)="onFilterChanged($event)">
                            </fwk-widget-filter>
                        </div>
                    </div>

                    <div *ngIf="widgetDef.dataSource && widgetDef.dataSource.length > 0; else noData" class="flex flex-auto items-center justify-between">
                        <ng-container *ngFor="let data of widgetDef.dataSource">
                            <div class="flex flex-col">
                                <div class="text-4xl sm:text-5xl font-extrabold leading-none tracking-tight"
                                    [ngClass]="{
                                        'text-blue-600 dark:text-blue-400': data.color === 'blue' || !data.color,
                                        'text-red-600 dark:text-red-400': data.color === 'red',
                                        'text-amber-600 dark:text-amber-400': data.color === 'amber',
                                        'text-green-600 dark:text-green-400': data.color === 'green'
                                    }">
                                    {{ data.mainStat | number:'1.0-0' }}
                                </div>
                                <div class="text-md font-medium text-secondary mt-1">
                                    {{ data.mainStatLabel || widgetDef.title }}
                                </div>
                            </div>
                            
                            <div *ngIf="widgetDef.icon" class="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <mat-icon class="icon-size-8" [svgIcon]="widgetDef.icon"></mat-icon>
                            </div>
                        </ng-container>
                    </div>

                    <div *ngFor="let data of widgetDef.dataSource">
                         <div *ngIf="data.secondaryStatLabel" class="text-secondary mt-4 flex items-center text-sm font-medium border-t pt-4">
                            <span class="truncate">{{ data.secondaryStatLabel }}</span>
                            <span class="ml-2 font-bold text-default">{{ data.secondaryStat | number }}</span>
                        </div>
                    </div>
                </ng-container>

                <ng-template #noData>
                    <div class="flex-auto flex items-center justify-center">
                        <fwk-widget-empty-state
                            [title]="'widget_empty_title' | translate"
                            [message]="'widget_empty_message' | translate">
                        </fwk-widget-empty-state>
                    </div>
                </ng-template>
            </ng-template>
        </div>
    `,
    hostDirectives: [{
        directive: BaseWidgetDirective,
        inputs: ['widgetDef', 'i18nName', 'globalFilters'],
        outputs: ['dataLoaded'],
    }],
    encapsulation: ViewEncapsulation.None
})
export class StatCardWidgetComponent implements OnInit {
    @Input() widgetDef: DashboardWidgetDef;
    @Input() i18nName: string;
    @Input() globalFilters: any;

    private baseDirective = inject(BaseWidgetDirective);
    private cdr = inject(ChangeDetectorRef);

    constructor() {
        this.baseDirective.dataLoaded.subscribe(() => {
            this.cdr.markForCheck();
        });
    }

    ngOnInit(): void {
        this.baseDirective.initialize();
    }

    onFilterChanged(value: string) {
        this.baseDirective.onFilterChanged(value);
    }

    onRetry(): void {
        this.onFilterChanged(this.widgetDef.filterConfig?.defaultOption || 'all');
    }
}