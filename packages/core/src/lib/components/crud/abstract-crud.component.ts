import { Directive, Injector, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Params } from '@angular/router';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { tap, finalize, takeUntil } from 'rxjs/operators';

import { AbstractComponent } from '../abstract-component.component';
import { FormService } from '../../services/dynamic-form/form.service';
import { CrudDefService } from '../../services/crud-def-service/crud-def.service';
import { CRUD } from '../../services/crud-service/crud';
import { GenericHttpService } from '../../services/generic-http-service/generic-http.service';
import { BaseCrudService } from '../../services/base-crud-service/base.crud.service';
import { ActionDefService } from '../../services/action-def-service/action-def.service';
import { ExpressionService } from '../../services/expression-service/expression.service';
import { SpinnerService } from '../../modules/spinner/service/spinner.service';
import { LocalStorageService } from '../../services/local-storage/local-storage.service';
import { DialogService } from '../../services/dialog-service/dialog.service';
import { FileService } from '../../services/file/file.service';
import { ClusterContextService } from '../../services/cluster-context.service';

import { I18n } from '../../model/i18n';
import { CrudDef } from '../../model/component-def/crud-def';
import { GridDef } from '../../model/component-def/grid-def';
import { Entity } from '../../model/entity';

@Directive()
export abstract class AbstractCrudComponent<E extends Entity, S extends CRUD<E>> extends AbstractComponent implements OnInit, OnDestroy, AfterViewInit {

    entity!: E;
    entities: E[] = [];
    service!: S;
    protected _cdr: ChangeDetectorRef;
    dataSource: E[] = [];
    public isTableLoading = false;
    addForm?: FormGroup;
    editForm?: FormGroup;
    crudDef!: CrudDef;
    filterEntity: any = {};
    appliedFilterEntity: any = {};
    i18nComponent?: I18n;
    globalActionContext: any = {};
    public parentTitle: string | null = null;
    public searchPerformed = false;
    public hasLoadError: boolean = false;
    public errorType: 'network' | 'server' = 'server';
    public updatingRowId: any = null;

    getRowId(entity: any): any {
        if (!entity) return null;
        const idDef = this.crudDef?.grid?.columnsDef?.find(c => c.id);
        const idKey = idDef ? idDef.columnDef : 'id';
        return entity[idKey] ?? entity.id;
    }

    get isInCluster(): boolean {
        return this._clusterContextService?.isActive ?? false;
    }

    protected spinnerControl: any;
    protected destroy$ = new Subject<void>();

    protected formService: FormService;
    protected crudDefService: CrudDefService;
    protected crudService: BaseCrudService;
    protected actionDefService: ActionDefService;
    protected genericHttpService: GenericHttpService;
    protected expressionService: ExpressionService;
    protected activatedRoute: ActivatedRoute;
    protected spinnerService: SpinnerService;
    protected dialog: MatDialog;
    protected localStorageService: LocalStorageService;
    protected dialogService: DialogService;
    protected fileService: FileService;
    protected _clusterContextService!: ClusterContextService;

    constructor(injector: Injector) {
        super(injector);

        this.formService = injector.get(FormService);
        this.crudDefService = injector.get(CrudDefService);
        this.crudService = injector.get(BaseCrudService);
        this.actionDefService = injector.get(ActionDefService);
        this.genericHttpService = injector.get(GenericHttpService);
        this.expressionService = injector.get(ExpressionService);
        this.activatedRoute = injector.get(ActivatedRoute);
        this.spinnerService = injector.get(SpinnerService);
        this.dialog = injector.get(MatDialog);
        this.localStorageService = injector.get(LocalStorageService);
        this.dialogService = injector.get(DialogService);
        this.fileService = injector.get(FileService);
        this._cdr = injector.get(ChangeDetectorRef);
        this.spinnerControl = this.spinnerService.getControlGlobalSpinner();
        this._clusterContextService = injector.get(ClusterContextService);
    }

    abstract newObjectEntity(): E;
    abstract getCRUDName(): string;

    private _isSubscribedToQueryParams = false;
    protected _isNavigatingFromSearch = false;
    protected _initialSearchDone = false;

    override ngOnInit(): void {
        super.ngOnInit();

        if (this._isSubscribedToQueryParams) {
            if (this.crudDef) {
                this._applyFiltersFromParams(this.activatedRoute.snapshot.queryParams);
            }
            return;
        }

        this._isSubscribedToQueryParams = true;
        this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            if (this._isNavigatingFromSearch) {
                this._isNavigatingFromSearch = false;
                const queryParams = { ...params };
                this.parentTitle = queryParams['parentTitle'] || null;
                this.findAll();
                return;
            }
            this._applyFiltersFromParams(params);
        });
    }

    private _applyFiltersFromParams(params: Params): void {
        const queryParams = { ...params };
        this.parentTitle = queryParams['parentTitle'] || null;
        delete queryParams['parentTitle'];

        this.filterEntity = {};

        if (this.crudDef) {
            this.applyParamsToFilter(queryParams, this.crudDef);

            const hasUrlFilters = Object.keys(this.filterEntity).some(key =>
                this.filterEntity[key] !== null &&
                this.filterEntity[key] !== undefined &&
                this.filterEntity[key] !== ''
            );

            const searchComp = (this as any).searchComponent;
            if (searchComp) {
                if (typeof searchComp.resetToDefaults === 'function') {
                    searchComp.resetToDefaults();
                }

                if (typeof searchComp.patchValue === 'function') {
                    searchComp.patchValue(this.filterEntity);
                } else if (searchComp.form) {
                    searchComp.form.patchValue(this.filterEntity, { emitEvent: false });
                    searchComp.entity = { ...searchComp.entity, ...this.filterEntity };
                    searchComp.updateActiveFilterCount();
                }
                this._cdr.markForCheck();
            }

            const hasFilterComponent = !!(this.crudDef.forms?.filter || this.crudDef.formsDef?.filter);

            const shouldSearch = hasUrlFilters || !this.crudDef.cancelInitSearch;

            if (shouldSearch) {
                this._initialSearchDone = true;
                this.findAll();
            }
        }
    }

    ngAfterViewInit(): void {
        if (this.filterEntity && Object.keys(this.filterEntity).length > 0) {
            const searchComp = (this as any).searchComponent;
            if (searchComp) {
                if (typeof searchComp.patchValue === 'function') {
                    searchComp.patchValue(this.filterEntity);
                } else {
                    searchComp.entity = { ...this.filterEntity };
                    if (searchComp.form) {
                        searchComp.form.patchValue(this.filterEntity, { emitEvent: false });
                        searchComp.updateActiveFilterCount();
                    }
                }
                this._cdr.markForCheck();
            }
        }
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy();
        this.destroy$.next();
        this.destroy$.complete();
    }

    protected applyParamsToFilter(params: Params, def: CrudDef): void {
        const filterFields = def.formsDef?.filter?.fields ?? def.forms?.filter;
        if (filterFields && params) {
            filterFields.forEach(field => {
                if (params[field.key] !== undefined) {
                    this.filterEntity[field.key] = params[field.key];
                }
            });
        }
    }

    public setUpCRUDDef(def: CrudDef): void {
        this.crudDef = def;
        this.name = def.name;

        if (def.i18n) {
            this.setUpI18n(def.i18n);
        }

        if (this.crudDef.ws && this.crudDef.ws.url) {
            this.crudService.setBaseURL(this.crudDef.ws.url);
            this.service = this.crudService as unknown as S;
        } else if (!this.crudDef.template) {
            console.error(`[AbstractCrudComponent] No se pudo configurar el servicio porque ws.url está vacío para ${this.name}.`);
        }

        if (this.crudDef.template) {
            if (this.crudDef.i18n) {
                this.i18nService.getByName(this.crudDef.i18n.name).subscribe(i18n => {
                    if (i18n) { this.i18nComponent = i18n; }
                });
            }
            return;
        }

        if (!this.crudDef.forms) { this.crudDef.forms = {}; }
        if (this.crudDef.forms.filter === undefined) { this.crudDef.forms.filter = this.crudDef.searchFields; }
        if (this.crudDef.formsDef?.create?.fields) { this.crudDef.forms.create = this.crudDef.formsDef.create.fields; }
        if (this.crudDef.formsDef?.update?.fields) { this.crudDef.forms.update = this.crudDef.formsDef.update.fields; }

        const processFormsAndFinish = (i18n: I18n | null) => {
            if (this.crudDef.forms?.update && this.crudDef.grid && this.crudDef.grid.showActionUpdate !== false) {
                if (!this.crudDef.grid.actions) {
                    this.crudDef.grid.actions = [];
                }
                const hasEditAction = this.crudDef.grid.actions.some(a => a.actionType === 'fwk_edit' || a.actionNameKey === 'grid_action_button_edit' || a.actionNameKey === 'fwk_action_edit');
                if (!hasEditAction) {
                    this.crudDef.grid.actions.push({
                        actionNameKey: 'grid_action_button_edit',
                        icon: 'edit',
                        actionType: 'fwk_edit',
                        displayType: 'menu'
                    });
                }
            }

            if (i18n && this.crudDef.forms) {
                this.setUpI18nForms(this.crudDef.forms, i18n);
            }
            if (i18n && this.crudDef.grid) {
                this.setUpI18nGrid(this.crudDef.grid, i18n);
            }

            if (this.crudDef.forms?.create) {
                this.addForm = this.formService.toFormGroup(this.crudDef.forms.create, {}, null);
            }
            if (this.crudDef.forms?.update) {
                this.editForm = this.formService.toFormGroup(this.crudDef.forms.update, {}, null);
            }

            this.postSetUpCrud(this.crudDef);
            this.executeInitWs();
        };

        if (this.crudDef.i18n) {
            this.i18nService.getByName(this.crudDef.i18n.name).subscribe(i18n => {
                if (!i18n) {
                    console.error(`[AbstractCrudComponent] No se encontró el diccionario '${this.crudDef.i18n.name}'`);
                    processFormsAndFinish(null);
                    return;
                }
                this.i18nComponent = new I18n();
                if (this.i18nComponent.clone) { this.i18nComponent.clone(i18n); }
                processFormsAndFinish(this.i18nComponent);
            });
        } else {
            processFormsAndFinish(null);
        }
    }

    postSetUpCrud(crudDef: CrudDef): void { /* Hook para clases hijas */ }
    postInitWs(res: any): void { /* Hook para clases hijas */ }

    executeInitWs(): void {
        if (this.crudDef?.initWs) {
            this.genericHttpService.callWs(this.crudDef.initWs).subscribe({
                next: (res: any) => {
                    if (typeof res === 'boolean') {
                        this.globalActionContext = {
                            result: res,
                            value: res,
                            data: res
                        };
                    } else if (res && typeof res === 'object') {
                        const dataVal = res.data !== undefined ? res.data : (res.result !== undefined ? res.result : res.value);
                        this.globalActionContext = Array.isArray(res)
                            ? { items: res, data: res, result: res, value: res }
                            : { data: dataVal, result: dataVal, value: dataVal, ...res };
                    } else {
                        this.globalActionContext = { value: res, result: res, data: res };
                    }
                    this.postInitWs(res);
                    this._cdr.markForCheck();
                },
                error: (err: any) => {
                    console.warn('[AbstractCrudComponent] initWs error:', err);
                }
            });
        }
    }

    private setUpI18nForms(forms: any, i18n: I18n): void {
        if (!forms) { return; }
        Object.keys(forms).forEach(propName => {
            const formFields = forms[propName];
            if (Array.isArray(formFields)) {
                formFields.forEach(field => {
                    if (field.labelKey) { field.label = i18n?.translate?.(field.labelKey); }
                });
            }
        });
    }

    private setUpI18nGrid(grid: GridDef, i18n: I18n): void {
        grid.columnsDef?.forEach((column) => {
            if (column.columnNameKey) {
                const translated = i18n?.translate?.(column.columnNameKey);
                column.columnName = (translated && translated !== column.columnNameKey)
                    ? translated
                    : this.i18nService.translate(column.columnNameKey);
            }
            if ((column as any).columnActions) {
                (column as any).columnActions.forEach((action: any) => {
                    if (action.actionNameKey) {
                        const translated = i18n?.translate?.(action.actionNameKey);
                        action.actionName = (translated && translated !== action.actionNameKey)
                            ? translated
                            : this.i18nService.translate(action.actionNameKey);
                    }
                });
            }
        });
        grid.actions?.forEach(action => {
            if (action.actionNameKey) {
                const translated = i18n?.translate?.(action.actionNameKey);
                action.actionName = (translated && translated !== action.actionNameKey)
                    ? translated
                    : this.i18nService.translate(action.actionNameKey);
            }

            if (action.confirm && action.confirm.messageKey) {
                const translated = i18n?.translate?.(action.confirm.messageKey);
                action.confirm.message = (translated && translated !== action.confirm.messageKey)
                    ? translated
                    : this.i18nService.translate(action.confirm.messageKey);
            }

            if (action.form && this.i18nComponent) {
                this.formService.setUpFieldTextFromI18n(this.i18nComponent, action.form);
            }
        });
    }

    findAll(): void {
        if (!this.service && !this.crudDef?.mock) {
            console.warn(`[FWK] findAll: No hay servicio para el componente: ${this.name}.`);
            return;
        }

        this.hasLoadError = false;
        this.searchPerformed = true;
        this.isTableLoading = true;

        if (this.crudDef?.mock) {
            const entities = this.crudDef.mockData || [];
            this.entities = entities;
            this.dataSource = this.entities;
            this.appliedFilterEntity = { ...this.filterEntity };

            setTimeout(() => {
                this.isTableLoading = false;
                this.postFindAll();
                this._cdr.markForCheck();
            }, 500);
            return;
        }

        const filterInMemory = this.crudDef.filterInMemory ?? true;
        const filterFields = this.crudDef.forms?.filter;
        const page = this.crudDef.serverPagination === true
            ? this.crudDef.pagination
            : undefined;

        this.service.findAll(this.filterEntity, filterFields, filterInMemory, page).pipe(
            finalize(() => {
                this.isTableLoading = false;
                this.updatingRowId = null;
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (entities) => {
                this.entities = entities;
                this.dataSource = this.entities;
                this.appliedFilterEntity = { ...this.filterEntity };
                this.hasLoadError = false;
                this.postFindAll();
            },
            error: (error) => {
                console.error(`[FWK] Error en findAll para ${this.name}:`, error);
                this.hasLoadError = true;
                if (!navigator.onLine || error?.status === 0 || error?.name === 'TimeoutError' || error?.message?.includes('Unknown Error')) {
                    this.errorType = 'network';
                } else {
                    this.errorType = 'server';
                }
            }
        });
    }


    postFindAll(): void { /* Hook para clases hijas */ }

    add(entity: E): Observable<any> {
        if (!entity) { return of(null); }
        if (this.crudDef?.mock) {
            this.crudDef.mockData = [...(this.crudDef.mockData || []), entity];
            return of(entity).pipe(tap(() => this.findAll()));
        }
        return this.service.add(entity);
    }

    edit(entity: E): Observable<any> {
        if (!entity) { return of(null); }
        this.updatingRowId = this.getRowId(entity);
        if (this.crudDef?.mock) {
            const index = this.crudDef.mockData.findIndex((e: any) => e.id === (entity as any).id);
            if (index > -1) { this.crudDef.mockData[index] = entity; }
            return of(entity).pipe(tap(() => this.findAll()));
        }
        return this.service.update(entity);
    }

    delete(entity: E): void {
        if (this.crudDef?.mock) {
            this.crudDef.mockData = (this.crudDef.mockData || []).filter((e: any) => e.id !== (entity as any).id);
            this.findAll();
            return;
        }
        this.service.delete(entity).subscribe(() => this.findAll());
    }

    deleteAll(entities: E[]): Observable<any> {
        if (this.crudDef?.mock) {
            const idsToDelete = new Set(entities.map(e => (e as any).id));
            this.crudDef.mockData = (this.crudDef.mockData || []).filter((e: any) => !idsToDelete.has((e as any).id));
            return of(true).pipe(tap(() => this.findAll()));
        }
        if (this.crudDef.grid?.deleteTernaria) {
            const singleIdKey = this.crudDef.grid.columnsDef.find(c => c.singleId)?.columnDef;
            const multiIdKey = this.crudDef.grid.columnsDef.find(c => c.multiId)?.columnDef;
            if (singleIdKey && multiIdKey) {
                entities.forEach(element => {
                    (element as any).singleId = (element as any)[singleIdKey];
                    (element as any).multiId = (element as any)[multiIdKey];
                });
                return this.service.deleteAllTernario(entities, singleIdKey, multiIdKey);
            }
        }
        const deleteRequests: Observable<any>[] = entities.map(entity => {
            const idKey = this.crudDef.grid?.columnsDef.find(c => c.id)?.columnDef;
            if (idKey) {
                entity.id = (entity as any)[idKey];
            }
            return this.service.delete(entity);
        });

        return forkJoin(deleteRequests);
    }

    filterSearchEntity(filterEntity: any): void {
        this.filterEntity = filterEntity;
        if (this.crudDef.pagination) { this.crudDef.pagination.page = 0; }

        const queryParams = { ...filterEntity };
        if (this.parentTitle) {
            queryParams['parentTitle'] = this.parentTitle;
        }

        Object.keys(queryParams).forEach(key => {
            const val = queryParams[key];
            if (val === null || val === undefined || val === '') {
                queryParams[key] = null;
            } else if (typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
                queryParams[key] = null;
            }
        });

        const currentParams = this.activatedRoute.snapshot.queryParams;
        let isIdentical = true;
        const allKeys = new Set([...Object.keys(queryParams), ...Object.keys(currentParams)]);
        
        for (const key of allKeys) {
            const val1 = queryParams[key] === null || queryParams[key] === undefined || queryParams[key] === '' ? null : String(queryParams[key]);
            const val2 = currentParams[key] === null || currentParams[key] === undefined || currentParams[key] === '' ? null : String(currentParams[key]);
            if (val1 !== val2) {
                isIdentical = false;
                break;
            }
        }

        if (isIdentical) {
            if (this._initialSearchDone) {
                this._initialSearchDone = false;
                return;
            }
            this.findAll();
        } else {
            this._isNavigatingFromSearch = true;
            this.router.navigate([], {
                relativeTo: this.activatedRoute,
                queryParams: queryParams,
                queryParamsHandling: 'merge',
                replaceUrl: true
            });
        }
    }

    override translate(key: string): string {
        let word = this.i18nComponent?.translate?.(key);
        if (word === key || !word) {
            word = super.translate(key) ?? key;
        }
        return word;
    }
}