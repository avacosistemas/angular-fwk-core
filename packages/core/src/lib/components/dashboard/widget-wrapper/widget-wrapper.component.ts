import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardWidgetDef } from '../../../model/component-def/dashboard-def';
import { BarChartWidgetComponent } from '../widgets/bar-chart-widget/bar-chart-widget.component';
import { PieChartWidgetComponent } from '../widgets/pie-chart-widget/pie-chart-widget.component';
import { StatCardWidgetComponent } from '../widgets/stat-card-widget/stat-card-widget.component';
import { LineChartWidgetComponent } from '../widgets/line-chart-widget/line-chart-widget.component';
import { DoughnutChartWidgetComponent } from '../widgets/doughnut-chart-widget/doughnut-chart-widget.component';
import { PolarAreaChartWidgetComponent } from '../widgets/polar-area-chart-widget/polar-area-chart-widget.component';

@Component({
    selector: 'fwk-widget-wrapper',
    standalone: true,
    imports: [
        CommonModule,
        BarChartWidgetComponent,
        PieChartWidgetComponent,
        StatCardWidgetComponent,
        LineChartWidgetComponent,
        DoughnutChartWidgetComponent,
        PolarAreaChartWidgetComponent,
    ],
    template: `
        <ng-container [ngSwitch]="widgetDef.type">
            <fwk-bar-chart-widget *ngSwitchCase="'bar'" [widgetDef]="widgetDef" [i18nName]="i18nName" [globalFilters]="globalFilters"></fwk-bar-chart-widget>
            <fwk-pie-chart-widget *ngSwitchCase="'pie'" [widgetDef]="widgetDef" [i18nName]="i18nName" [globalFilters]="globalFilters"></fwk-pie-chart-widget>
            <fwk-stat-card-widget *ngSwitchCase="'stat'" [widgetDef]="widgetDef" [i18nName]="i18nName" [globalFilters]="globalFilters"></fwk-stat-card-widget>
            <fwk-line-chart-widget *ngSwitchCase="'line'" [widgetDef]="widgetDef" [i18nName]="i18nName" [globalFilters]="globalFilters"></fwk-line-chart-widget>
            <fwk-doughnut-chart-widget *ngSwitchCase="'donut'" [widgetDef]="widgetDef" [i18nName]="i18nName" [globalFilters]="globalFilters"></fwk-doughnut-chart-widget>
            <fwk-polar-area-chart-widget *ngSwitchCase="'polarArea'" [widgetDef]="widgetDef" [i18nName]="i18nName" [globalFilters]="globalFilters"></fwk-polar-area-chart-widget>
            
            <div *ngSwitchCase="'widget-group'" class="flex flex-col gap-6 h-full">
                <ng-container *ngFor="let childWidget of widgetDef.children">
                    <div [ngClass]="getFlexClass(childWidget.size)" class="flex">
                         <fwk-widget-wrapper [widgetDef]="childWidget" [i18nName]="i18nName" [globalFilters]="globalFilters"></fwk-widget-wrapper>
                    </div>
                </ng-container>
            </div>
        </ng-container>
    `,
    encapsulation: ViewEncapsulation.None
})
export class WidgetWrapperComponent {
    @Input() widgetDef: DashboardWidgetDef;
    @Input() i18nName: string;
    @Input() globalFilters: any;

    getFlexClass(size: string): string {
        switch (size) {
            case 'full': return 'flex-auto';
            default: return 'flex-initial';
        }
    }
}