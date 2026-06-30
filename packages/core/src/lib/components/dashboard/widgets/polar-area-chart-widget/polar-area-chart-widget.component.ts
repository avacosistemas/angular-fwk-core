import { Component, Input, OnInit, ViewEncapsulation, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseWidgetDirective } from '../../base-widget.directive';
import { WidgetFilterComponent } from '../widget-filter/widget-filter.component';
import { DashboardWidgetDef, ApexChartOptions } from '../../../../model/component-def/dashboard-def';
import { WidgetSkeletonComponent } from '../widget-skeleton/widget-skeleton.component';
import { WidgetErrorStateComponent } from '../widget-error-state/widget-error-state.component';
import { WidgetEmptyStateComponent } from '../widget-empty-state/widget-empty-state.component';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';

@Component({
    selector: 'fwk-polar-area-chart-widget',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule, WidgetFilterComponent, WidgetSkeletonComponent, WidgetErrorStateComponent, WidgetEmptyStateComponent],
    template: `
        <div class="bg-card flex flex-col overflow-hidden rounded-2xl p-6 shadow">
            <div class="flex items-start justify-between">
                <div class="truncate text-lg font-medium leading-6 tracking-tight">{{ widgetDef?.title }}</div>
                <fwk-widget-filter *ngIf="widgetDef?.filterConfig?.show"
                    [options]="widgetDef.filterConfig.options"
                    [initialValue]="widgetDef.filterConfig.defaultOption"
                    (filterChange)="onFilterChanged($event)">
                </fwk-widget-filter>
            </div>
            <div class="relative flex-auto mt-4">
                <ng-container *ngIf="widgetDef?.isLoading">
                    <div class="relative inset-0 flex items-center justify-center">
                        <fwk-widget-skeleton [type]="widgetDef.type" class="w-full"></fwk-widget-skeleton>
                    </div>
                </ng-container>

                <ng-container *ngIf="!widgetDef.isLoading && widgetDef.hasError">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <fwk-widget-error-state 
                            [title]="'widget_error_title' | translate"
                            [message]="widgetDef.errorMessage"
                            (retry)="onRetry()">
                        </fwk-widget-error-state>
                    </div>
                </ng-container>
                
                <ng-container *ngIf="!widgetDef?.isLoading">
                    <apx-chart #chart
                        *ngIf="chartOptions"
                        class="absolute inset-0"
                        [class.opacity-0]="widgetDef.isLoading || widgetDef.hasError || !hasData()"
                        [series]="chartOptions.series"
                        [chart]="chartOptions.chart"
                        [labels]="chartOptions.labels"
                        [stroke]="chartOptions.stroke"
                        [fill]="chartOptions.fill"
                        [responsive]="chartOptions.responsive"
                        [theme]="chartOptions.theme"
                        [legend]="chartOptions.legend">
                    </apx-chart>
                </ng-container>
                
                <ng-container *ngIf="!widgetDef.isLoading && !widgetDef.hasError && !hasData()">
                    <div class="absolute inset-0 flex items-center justify-center">
                        <fwk-widget-empty-state
                            [title]="'widget_empty_title' | translate"
                            [message]="'widget_empty_message' | translate">
                        </fwk-widget-empty-state>
                    </div>
                </ng-container>
            </div>
        </div>
    `,
    hostDirectives: [{
        directive: BaseWidgetDirective,
        inputs: ['widgetDef', 'i18nName', 'globalFilters'],
        outputs: ['dataLoaded'],
    }],
    encapsulation: ViewEncapsulation.None
})
export class PolarAreaChartWidgetComponent implements OnInit {
    @ViewChild('chart') chart: ChartComponent;
    @Input() widgetDef: DashboardWidgetDef;
    @Input() i18nName: string;
    @Input() globalFilters: any;

    public chartOptions: Partial<ApexChartOptions>;

    private baseDirective = inject(BaseWidgetDirective);
    private cdr = inject(ChangeDetectorRef);

    constructor() {
        this.baseDirective.dataLoaded.subscribe(() => this.updateChartData());
    }

    ngOnInit(): void {
        this.baseDirective.initialize();
        this.prepareChartOptions();
    }

    updateChartData(): void {
        if (this.widgetDef?.apexChartData) {
            this.chartOptions = {
                ...this.chartOptions,
                series: this.widgetDef.apexChartData.series,
                labels: this.widgetDef.apexChartData.labels,
            };
            this.cdr.markForCheck();
        }
    }

    hasData(): boolean {
        const series = this.widgetDef?.apexChartData?.series as number[];
        return !!(series && series.length > 0 && series.some(v => v > 0));
    }

    prepareChartOptions(): void {
        this.chartOptions = {
            chart: {
                type: 'polarArea',
                height: 350,
                toolbar: { show: false },
                zoom: { enabled: false },
            },
            series: [],
            labels: [],
            stroke: { colors: ['#FFFFFF'] },
            fill: { opacity: 0.8 },
            legend: { position: 'bottom' },
            theme: {
                mode: document.body.classList.contains('dark') ? 'dark' : 'light'
            },
        };
    }

    onFilterChanged(value: string) {
        this.baseDirective.onFilterChanged(value);
    }

    onRetry(): void {
        this.onFilterChanged(this.widgetDef.filterConfig?.defaultOption || 'all');
    }
}