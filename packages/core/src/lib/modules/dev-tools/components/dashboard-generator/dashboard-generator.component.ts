import { Component, ChangeDetectionStrategy, OnInit, inject, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, finalize, startWith, takeUntil, map, Observable } from 'rxjs';
import { DevToolsService } from '../../services/dev-tools.service';
import { NotificationService } from '../../../../services/notification/notification.service';
import { NAVIGATION_GROUPS_MAP } from 'app/core/navigation/navigation.groups';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FWK_CONFIG, FwkConfig } from '../../../../model/fwk-config';
import { IconPickerComponent } from '../../../../components/icon-picker/icon-picker.component';
import { DevToolsStateService } from '../../services/dev-tools-state.service';
import { TranslatePipe } from '../../../../pipe/translate.pipe';
import { FwkMediaWatcherService } from '../../../../layout/infrastructure/services/media-watcher';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

@Component({
    selector: 'fwk-dashboard-generator',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatStepperModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatCheckboxModule, MatProgressSpinnerModule, MatTooltipModule, TitleCasePipe, MatSlideToggleModule, IconPickerComponent, TranslatePipe, MatTableModule],
    templateUrl: './dashboard-generator.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardGeneratorComponent implements OnInit, OnDestroy {
    @ViewChild('stepper') stepper: MatStepper;

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _notificationService = inject(NotificationService);
    private _cdr = inject(ChangeDetectorRef);
    private _unsubscribeAll = new Subject<void>();
    private _devToolsStateService = inject(DevToolsStateService);
    private _fwkMediaWatcherService = inject(FwkMediaWatcherService);
    private _fwkConfig = inject<FwkConfig>(FWK_CONFIG);

    isScreenSmall$: Observable<boolean> = this._fwkMediaWatcherService.onMediaChange$
        .pipe(map(({ matchingAliases }) => !matchingAliases.includes('md')));

    step1Form: FormGroup;
    step2Form: FormGroup;
    step3Form: FormGroup;

    isGenerating = false;
    autoReadAccess: string;

    navigationGroups = [...NAVIGATION_GROUPS_MAP];
    widgetTypeChoices = ['stat', 'bar', 'pie', 'donut', 'line', 'polarArea'];
    widgetSizeChoices = ['full', 'half', 'quarter'];
    statsApiPrefix = this._fwkConfig.apiBaseUrl!.includes('test') ? 'PREFIX_STATS_API + \'' : this._fwkConfig.apiBaseUrl + 'estadisticas/';

    dataSources: MatTableDataSource<AbstractControl>[] = [];

    get widgets(): FormArray {
        return this.step3Form.get('widgets') as FormArray;
    }

    ngOnInit(): void {
        this.step1Form = this._fb.group({
            fileName: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
            pageTitle: ['', Validators.required],
            navGroup: ['estadisticas', Validators.required],
            navIcon: ['heroicons_outline:chart-pie'],
            showInMenu: [true],
        });

        this.step2Form = this._fb.group({
            customize: [false],
            readAccess: [''],
        });

        this.step3Form = this._fb.group({
            widgets: this._fb.array([], Validators.required)
        });

        this.step1Form.get('fileName')!.valueChanges.pipe(
            startWith(this.step1Form.get('fileName')!.value),
            takeUntil(this._unsubscribeAll)
        ).subscribe(name => {
            const constName = (name || 'dashboard').toUpperCase().replace(/-/g, '_');
            this.autoReadAccess = `${constName}_READ`;
            this._cdr.markForCheck();
        });

        this.addWidget();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    createWidgetGroup(): FormGroup {
        const widgetGroup = this._fb.group({
            widgetTitle: ['', Validators.required],
            widgetType: ['bar', Validators.required],
            widgetSize: ['half', Validators.required],
            widgetEndpoint: ['', Validators.required],
            hasFilters: [false],
            filters: this._fb.array([])
        });

        widgetGroup.get('hasFilters')?.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe(hasFilters => {
            const filtersArray = widgetGroup.get('filters') as FormArray;
            if (hasFilters && filtersArray.length === 0) {
                this.addFilter(this.widgets.controls.indexOf(widgetGroup));
            }
        });

        return widgetGroup;
    }

    addWidget(): void {
        const newWidgetGroup = this.createWidgetGroup();
        this.widgets.push(newWidgetGroup);
        this.dataSources.push(new MatTableDataSource((newWidgetGroup.get('filters') as FormArray).controls));
    }

    removeWidget(index: number): void {
        this.widgets.removeAt(index);
        this.dataSources.splice(index, 1);
    }

    getWidgetFilters(widgetIndex: number): FormArray {
        return this.widgets.at(widgetIndex).get('filters') as FormArray;
    }

    createFilterGroup(): FormGroup {
        return this._fb.group({
            viewValue: ['', Validators.required],
            value: [''],
        });
    }

    addFilter(widgetIndex: number): void {
        const filtersArray = this.getWidgetFilters(widgetIndex);
        filtersArray.push(this.createFilterGroup());
        this.dataSources[widgetIndex].data = filtersArray.controls;
    }

    removeFilter(widgetIndex: number, filterIndex: number): void {
        const filtersArray = this.getWidgetFilters(widgetIndex);
        filtersArray.removeAt(filterIndex);
        this.dataSources[widgetIndex].data = filtersArray.controls;
    }

    generate(): void {
        if (this.step1Form.invalid || this.step2Form.invalid || this.step3Form.invalid) {
            this._notificationService.notifyError('Por favor, completa todos los campos requeridos en todos los pasos.');
            return;
        }

        this.isGenerating = true;
        this._cdr.markForCheck();

        const config = {
            ...this.step1Form.getRawValue(),
            security: this.step2Form.getRawValue(),
            widgets: this.step3Form.getRawValue().widgets,
        };

        this._devToolsService.generateDashboard(config).pipe(
            finalize(() => {
                if (this.isGenerating) {
                    this.isGenerating = false;
                    this._cdr.markForCheck();
                }
            })
        ).subscribe({
            next: (res) => {
                this._devToolsStateService.show(res.message || 'Dashboard generado exitosamente.');
            },
            error: (err) => this._notificationService.notifyError(err.error?.message || 'Error al generar el dashboard.')
        });
    }

    getNavGroupName(): string {
        return this.navigationGroups.find(g => g.id === this.step1Form.value.navGroup)?.title || 'N/A';
    }
}