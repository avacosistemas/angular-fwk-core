import { Component, ChangeDetectionStrategy, inject, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { toConstCase } from '../../../dev-tools.utils';
import { TranslatePipe } from '../../../../../pipe/translate.pipe';
import { DevToolsService } from '../../../services/dev-tools.service';
import { DevToolsStateService } from '../../../services/dev-tools-state.service';
import { NotificationService } from '../../../../../services/notification/notification.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

@Component({
    selector: 'fwk-dashboard-editor',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule, MatSelectModule,
        MatTooltipModule, TranslatePipe, TitleCasePipe,
        MatExpansionModule,
        MatTableModule
    ],
    templateUrl: './dashboard-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardEditorComponent implements OnChanges {
    @Input() definitionId: string;

    private _dashboardData: any;
    @Input()
    set dashboardData(value: any) {
        this._dashboardData = value || { widgets: [] };
    }
    get dashboardData(): any {
        return this._dashboardData;
    }

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _devToolsStateService = inject(DevToolsStateService);
    private _notificationService = inject(NotificationService);
    private _cdr = inject(ChangeDetectorRef);

    dashboardForm: FormGroup;
    isSaving = false;

    dataSources: MatTableDataSource<AbstractControl>[] = [];

    widgetTypeChoices = ['stat', 'bar', 'pie', 'donut', 'line', 'polarArea', 'widget-group'];
    widgetSizeChoices = ['full', 'half', 'third', 'quarter'];

    get dashboardWidgets(): FormArray { return this.dashboardForm.get('widgets') as FormArray; }

    constructor() {
        this.dashboardForm = this._fb.group({
            widgets: this._fb.array([])
        });
        this.dashboardForm.disable();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['dashboardData'] && this.dashboardData) {
            this.patchDashboardForm(this.dashboardData);
        }
    }

    private patchDashboardForm(data: any): void {
        this.dashboardForm.reset({}, { emitEvent: false });
        this.dashboardWidgets.clear({ emitEvent: false });
        this.dataSources = [];

        if (Array.isArray(data.widgets)) {
            data.widgets.forEach(widgetData => {
                const widgetGroup = this.createWidgetGroup(widgetData);
                this.dashboardWidgets.push(widgetGroup, { emitEvent: false });
                this.dataSources.push(new MatTableDataSource((widgetGroup.get('filterConfig.options') as FormArray).controls));
            });
        }

        this.dashboardForm.enable();
        this.dashboardForm.markAsPristine();
        this._cdr.markForCheck();
    }

    saveDashboardConfig(): void {
        if (!this.dashboardForm.dirty) {
            this._notificationService.notify('No hay cambios para guardar.');
            return;
        }

        this.isSaving = true;
        this.dashboardForm.disable();
        this._cdr.markForCheck();

        const rawValue = this.dashboardForm.getRawValue();

        const currentI18nWords = this.dashboardData.i18n?.words || {};
        const finalI18nWords = { ...currentI18nWords };

        rawValue.widgets.forEach(widget => {
            if (widget.titleKey && widget.titleValue) {
                finalI18nWords[widget.titleKey] = widget.titleValue;
            }
        });

        const payload = {
            dashboardData: rawValue,
            i18nUpdates: finalI18nWords
        };

        this._devToolsService.updateDashboardDefinition(this.definitionId, payload).pipe(
            finalize(() => {
                this.isSaving = false;
                this.dashboardForm.enable();
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (res) => {
                this.dashboardForm.markAsPristine();
                this._devToolsStateService.show(res.message);
            },
            error: (err) => {
                this._notificationService.notifyError(err.error?.message || 'Error al guardar la configuración del dashboard.');
            }
        });
    }

    createWidgetGroup(widgetData?: any): FormGroup {
        const options = widgetData?.filterConfig?.options;
        const filterControls = (Array.isArray(options) ? options : []).map(f => this.createFilterGroup(f));

        const defaultWsKey = widgetData?.titleValue ? `${toConstCase(widgetData.titleValue)}_URL` : '';
        const widgetGroup = this._fb.group({
            titleKey: [widgetData?.titleKey || '', Validators.required],
            titleValue: [widgetData?.titleValue || '', Validators.required],
            type: [widgetData?.type || 'bar', Validators.required],
            size: [widgetData?.size || 'half', Validators.required],
            ws: this._fb.group({
                key: [widgetData?.ws?.key || defaultWsKey, Validators.required],
                url: [widgetData?.ws?.url?.replace(/%%PREFIX_STATS_API \+ '|'%%/g, '') || '', Validators.required]
            }),
            filterConfig: this._fb.group({
                show: [widgetData?.filterConfig?.show || false],
                options: this._fb.array(filterControls),
                defaultOption: [widgetData?.filterConfig?.defaultOption || 'all']
            })
        });

        const titleControl = widgetGroup.get('titleValue');
        const titleKeyControl = widgetGroup.get('titleKey');
        const wsKeyControl = widgetGroup.get('ws.key');

        if (titleControl && titleKeyControl && wsKeyControl) {
            titleControl.valueChanges.subscribe(newTitle => {
                if (titleKeyControl.pristine || !titleKeyControl.value) {
                    const newTitleKey = newTitle ? `${this.definitionId.replace(/-/g, '_')}_widget_${newTitle.toLowerCase().replace(/[ -]/g, '_')}` : '';
                    titleKeyControl.setValue(newTitleKey);
                }
                if (wsKeyControl.pristine || !wsKeyControl.value) {
                    const newKey = newTitle ? `${toConstCase(newTitle)}_URL` : '';
                    wsKeyControl.setValue(newKey);
                }
            });
        }

        const showControl = widgetGroup.get('filterConfig.show');
        const optionsArray = widgetGroup.get('filterConfig.options') as FormArray;
        showControl?.valueChanges.subscribe(show => {
            if (show && optionsArray.length === 0) {
                const widgetIndex = this.dashboardWidgets.controls.indexOf(widgetGroup);
                if (widgetIndex > -1) {
                    this.addFilter(widgetIndex);
                }
            }
        });
        return widgetGroup;
    }

    addWidget(): void {
        const newWidgetGroup = this.createWidgetGroup();
        this.dashboardWidgets.push(newWidgetGroup);
        this.dataSources.push(new MatTableDataSource((newWidgetGroup.get('filterConfig.options') as FormArray).controls));
        this.dashboardForm.markAsDirty();
    }

    removeWidget(index: number): void {
        this.dashboardWidgets.removeAt(index);
        this.dataSources.splice(index, 1);
        this.dashboardForm.markAsDirty();
    }

    getWidgetFilters(widgetIndex: number): FormArray {
        return (this.dashboardWidgets.at(widgetIndex) as FormGroup).get('filterConfig.options') as FormArray;
    }

    createFilterGroup(filterData?: any): FormGroup {
        return this._fb.group({
            viewValue: [filterData?.viewValue || '', Validators.required],
            value: [filterData?.value || '']
        });
    }

    addFilter(widgetIndex: number): void {
        const filtersArray = this.getWidgetFilters(widgetIndex);
        filtersArray.push(this.createFilterGroup());
        this.dataSources[widgetIndex].data = filtersArray.controls;
        this.dashboardForm.markAsDirty();
    }

    removeFilter(widgetIndex: number, filterIndex: number): void {
        const filtersArray = this.getWidgetFilters(widgetIndex);
        filtersArray.removeAt(filterIndex);
        this.dataSources[widgetIndex].data = filtersArray.controls;
        this.dashboardForm.markAsDirty();
    }
}