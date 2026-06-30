import { WsDef } from '../ws-def';
import {
    ApexAxisChartSeries,
    ApexChart,
    ApexDataLabels,
    ApexFill,
    ApexLegend,
    ApexNonAxisChartSeries,
    ApexPlotOptions,
    ApexResponsive,
    ApexStates,
    ApexStroke,
    ApexTheme,
    ApexTitleSubtitle,
    ApexXAxis,
    ApexYAxis,
} from 'ng-apexcharts';

export type ApexChartOptions = {
    series: ApexAxisChartSeries | ApexNonAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis | ApexYAxis[];
    title: ApexTitleSubtitle;
    dataLabels: ApexDataLabels;
    stroke: ApexStroke;
    legend: ApexLegend;
    fill: ApexFill;
    states: ApexStates;
    theme: ApexTheme;
    plotOptions: ApexPlotOptions;
    responsive: ApexResponsive[];
    labels: string[];
};

export interface DashboardFilterOption {
    value: string;
    viewValue: string;
}

export interface DashboardFilterConfig {
    show: boolean;
    options: DashboardFilterOption[];
    defaultOption: string;
}

export interface ChartJsData {
    labels: string[];
    datasets: any[];
}

export interface StatData {
    mainStat: number;
    mainStatLabel: string;
    title: string;
    secondaryStat?: number;
    secondaryStatLabel?: string;
    color?: 'blue' | 'red' | 'amber' | 'green';
}

export interface DashboardFilterDef {
    id: string;
    type: 'select' | 'date-range';
    labelKey?: string;
    options?: DashboardFilterOption[];
    defaultOption?: any;
    params?: {
        startKey?: string;
        endKey?: string;
    };
}

export interface DashboardWidgetDef {
    type: 'stat' | 'pie' | 'bar' | 'line' | 'donut' | 'widget-group' | 'content-card' | 'polarArea';
    size: 'full' | 'half' | 'third' | 'quarter';
    title?: string;
    titleKey?: string;
    children?: DashboardWidgetDef[];
    ws?: WsDef;
    icon?: string;
    filterConfig?: DashboardFilterConfig;
    apexChartData?: Partial<ApexChartOptions>;
    dataSource?: StatData[];
    chartJsData?: ChartJsData;
    isLoading?: boolean;
    hasError?: boolean;
    errorMessage?: string;
}

export interface DashboardLayoutDef {
    pageIdentifier: string;
    sectionTitle?: string;
    sectionTitleKey?: string;
    widgets: DashboardWidgetDef[];
    filters?: DashboardFilterDef[];
}