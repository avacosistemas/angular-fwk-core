import { Directive, Input, Output, EventEmitter, inject, OnChanges } from '@angular/core';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { DashboardWidgetDef, StatData } from '../../model/component-def/dashboard-def';
import { GenericHttpService } from '../../services/generic-http-service/generic-http.service';
import { I18nService } from '../../services/i18n-service/i18n.service';

@Directive({
    selector: '[fwkBaseWidget]',
    standalone: true,
})
export class BaseWidgetDirective {
    @Input() widgetDef: DashboardWidgetDef;
    @Input() i18nName: string;
    @Input() globalFilters: any;
    @Output() dataLoaded = new EventEmitter<void>();

    protected genericHttpService = inject(GenericHttpService);
    private i18nService = inject(I18nService);

    protected currentLocalFilter: any = 'all';

    public initialize(): void {
        this.resolveWidgetTitle();
        this.currentLocalFilter = this.widgetDef.filterConfig?.defaultOption || 'all';
        this.loadData();
    }

    ngOnChanges(changes: any): void {
        if (changes.globalFilters && !changes.globalFilters.firstChange) {
            this.loadData();
        }
    }

    private resolveWidgetTitle(): void {
        if (this.widgetDef.titleKey && this.i18nName) {
            const dictionary = this.i18nService.getDictionary(this.i18nName);
            this.widgetDef.title = dictionary?.translate?.(this.widgetDef.titleKey) || this.widgetDef.titleKey;
        }
    }

    public loadData(): void {
        if (!this.widgetDef || this.widgetDef.type === 'widget-group' || !this.widgetDef.ws) {
            this.dataLoaded.emit();
            return;
        }

        this.widgetDef.isLoading = true;
        this.widgetDef.hasError = false;

        const params = this.getFilterParamsForApi();

        this.genericHttpService.httpGet(this.widgetDef.ws.url, params)
            .pipe(
                map(data => {
                    let actualData = data;
                    if (data && data.hasOwnProperty('data')) {
                        actualData = data.data;
                    }

                    if (this.widgetDef.type === 'stat') {
                        if (Array.isArray(actualData)) {
                            this.widgetDef.dataSource = actualData.map(item => this._mapDataToStatFormat(item));
                        } else if (actualData) {
                            this.widgetDef.dataSource = [this._mapDataToStatFormat(actualData)];
                        }
                    } else {
                        const chartArray = Array.isArray(actualData) ? actualData : [];
                        this.widgetDef.apexChartData = this._mapDataToApexChartsFormat(chartArray);
                    }
                }),
                catchError(error => {
                    console.error(`[Dashboard Widget] Error cargando datos para "${this.widgetDef.title}":`, error);
                    this.widgetDef.hasError = true;
                    this.widgetDef.errorMessage = this.i18nService.getDictionary('fwk')?.translate?.('widget_error_default_message') ?? 'widget_error_default_message';
                    return of(null);
                }),
                finalize(() => {
                    this.widgetDef.isLoading = false;
                    this.dataLoaded.emit();
                })
            )
            .subscribe();
    }

    private _mapDataToStatFormat(apiData: any): StatData {
        return {
            mainStat: (apiData.value !== undefined && apiData.value !== null) ? Number(apiData.value) : 0,
            mainStatLabel: apiData.name || '',
            title: apiData.title || '',
            secondaryStat: (apiData.secondaryValue !== undefined && apiData.secondaryValue !== null) ? Number(apiData.secondaryValue) : undefined,
            secondaryStatLabel: apiData.secondaryLabel || undefined,
            color: apiData.color || 'blue'
        };
    }

    private _mapDataToApexChartsFormat(apiData: Array<{ name: string; value: string | number }>) {
        if (!apiData || apiData.length === 0) {
            return { series: [], labels: [] };
        }

        const labels = apiData.map(item => item.name);
        const data = apiData.map(item => Number(item.value));

        const chartType = this.widgetDef.type;

        if (chartType === 'pie' || chartType === 'donut' || chartType === 'polarArea') {
            return {
                series: data,
                labels: labels,
            };
        }

        return {
            series: [{
                name: this.widgetDef.title || 'Datos',
                data: data,
            }],
            xaxis: {
                categories: labels,
            },
        };
    }

    protected getFilterParamsForApi(): any {
        let params: { [key: string]: any } = {};

        // Local widget filter
        const localFilter = this.currentLocalFilter;
        if (localFilter) {
            if (typeof localFilter === 'object' && localFilter.type === 'date-range') {
                if (localFilter.value.start) params['fechaDesde'] = this.formatDate(localFilter.value.start);
                if (localFilter.value.end) params['fechaHasta'] = this.formatDate(localFilter.value.end);
            } else if (typeof localFilter === 'string' && localFilter.toLowerCase() !== 'all') {
                params['filter'] = localFilter;
            }
        }

        // Global filters (only if not overridden by local range)
        if (this.globalFilters) {
            Object.keys(this.globalFilters).forEach(key => {
                const val = this.globalFilters[key];
                if (val && typeof val === 'object' && (val.start || val.end)) {
                    // Only apply global date range if local isn't set to range
                    if (!params['fechaDesde'] && !params['fechaHasta']) {
                        if (val.start) params['fechaDesde'] = this.formatDate(val.start);
                        if (val.end) params['fechaHasta'] = this.formatDate(val.end);
                    }
                } else if (val && val !== 'all' && !params[key]) {
                    params[key] = val;
                }
            });
        }
        return params;
    }

    private formatDate(date: Date): string {
        if (!date) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    onFilterChanged(filterValue: any): void {
        this.currentLocalFilter = filterValue;
        this.loadData();
    }
}