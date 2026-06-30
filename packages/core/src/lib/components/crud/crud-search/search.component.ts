import { OnInit, Component, Injector, Input, Output, EventEmitter, ViewChild, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, forwardRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, I18nPluralPipe } from '@angular/common';
import { FormGroup, FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionPanel, MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute } from '@angular/router';

import { AbstractComponent } from '../../abstract-component.component';
import { DynamicField } from '../../../model/dynamic-form/dynamic-field';
import { DialogService } from '../../../services/dialog-service/dialog.service';
import { LocalStorageService } from '../../../services/local-storage/local-storage.service';
import { FormService } from '../../../services/dynamic-form/form.service';
import { CrudDef } from '../../../model/component-def/crud-def';
import { DynamicFormComponent } from '../../dynamic-form/dynamic-form.component';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { I18n } from '../../../model/i18n';

@Component({
  selector: 'fwk-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatExpansionModule,
    MatBadgeModule,
    MatMenuModule,
    MatCheckboxModule,
    forwardRef(() => DynamicFormComponent),
    I18nPluralPipe,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent extends AbstractComponent implements OnInit, AfterViewInit, OnChanges {

  @Input() title: string | undefined;
  @Input() forceFirstSubmit: boolean = false;
  @Input() fields!: DynamicField<any>[];
  @Input() crudDef!: CrudDef;
  @Input() columnsDef: any[] = [];
  @Input() displayedColumns: string[] = [];
  @Input() override i18n: I18n;

  @Output() displayedColumnsChange = new EventEmitter<string[]>();
  @Output() onChangeSearchEntity = new EventEmitter<any>();

  @ViewChild('ngformElement') ngFormElement!: NgForm;
  @ViewChild('searchPanel') searchPanel!: MatExpansionPanel;

  firstSubmitForced: boolean = false;
  form: FormGroup = new FormGroup({});
  entity: any = {};
  generalFields: DynamicField<any>[] = [];
  visibleGeneralFields: DynamicField<any>[] = [];
  hasVisibleFields: boolean = false;
  fieldsOptions: DynamicField<any>[] = [];
  activeFilterCount = 0;

  columnVisibility = new Map<string, boolean>();
  menuColumns: { columnDef: string, columnName: string }[] = [];
  columnsAltered: boolean = false;
  private initialDisplayableColumns: string[] = [];

  private cacheFields: DynamicField<any>[] = [];
  private dialogService: DialogService;
  private localStorageService: LocalStorageService;
  private formService: FormService;

  activeFilterCountMapping: any;

  constructor(
    private injector: Injector,
    private _cdr: ChangeDetectorRef,
  ) {
    super(injector);
    this.dialogService = injector.get(DialogService);
    this.localStorageService = injector.get(LocalStorageService);
    this.formService = injector.get(FormService);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fields']) {
      this.onInit();
      this.updateActiveFilterCount();

      this.initialDisplayableColumns = this.displayedColumns.filter(col => !col.startsWith('_'));
      this.buildMenuColumns();
      this.initializeColumnVisibility();
    } else {
      if (changes['displayedColumns']) {
        this.initializeColumnVisibility();
      }
      if (changes['columnsDef']) {
        this.buildMenuColumns();
      }
    }
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.activeFilterCountMapping = {
      '=1': this.translate('search_filter_count_singular'),
      'other': this.translate('search_filter_count_plural')
    };
    this.onInit();
    this.updateActiveFilterCount();
  }

  ngAfterViewInit(): void {
    if (this.forceFirstSubmit && !this.firstSubmitForced) {
      if (!this.crudDef?.cancelInitSearch || this.userChangeOptions()) {
        Promise.resolve().then(() => {
          this.onSubmitSearch();
          this._cdr.markForCheck();
        });
      }
    }
  }

  private buildMenuColumns(): void {
    if (!this.columnsDef) {
      this.menuColumns = [];
      return;
    }

    this.menuColumns = this.columnsDef
      .filter(col => !!col.columnName)
      .map(col => ({
        columnDef: col.columnDef,
        columnName: col.columnName
      }));
  }

  private initializeColumnVisibility(): void {
    if (this.columnsDef) {
      this.columnsDef.forEach(col => {
        this.columnVisibility.set(col.columnDef, this.displayedColumns.includes(col.columnDef));
      });
      this._checkColumnsAltered();
    }
  }

  toggleColumnVisibility(columnDef: string): void {
    const isVisible = this.columnVisibility.get(columnDef);
    this.columnVisibility.set(columnDef, !isVisible);

    const newDisplayedColumns = this.columnsDef
      .filter(col => this.columnVisibility.get(col.columnDef))
      .map(col => col.columnDef);

    this.displayedColumnsChange.emit(newDisplayedColumns);
    this._checkColumnsAltered();
  }

  onInit() {
    this.form = new FormGroup({});
    const originalPatchValue = this.form.patchValue.bind(this.form);
    this.form.patchValue = (value: any, options?: any) => {
      originalPatchValue(value, options);
      const subForm = this.form.get('subForm') as FormGroup;
      if (subForm) {
        subForm.patchValue(value, options);
      }
    };
    this.reInit();
  }

  private reInit() {
    this.entity = {};
    this.cacheFields = this.fields ? this.localStorageService.clone(this.fields) : [];

    this.generalFields = this.getGeneralFields(this.cacheFields);
    this.fieldsOptions = this.cacheFields.filter(f => !f.options?.baseFilter);

    this.fieldsOptions.forEach(field => {
      if (field.colSpan === undefined || field.colSpan === null) {
        field.colSpan = 1;
      }
    });

    this.generalFields.forEach(field => {
      if (field.colSpan === undefined || field.colSpan === null) {
        field.colSpan = 1;
      }
    });

    this.visibleGeneralFields = this.generalFields.filter(field =>
      field.controlType !== 'hidden' && !field.options?.hidden
    );

    this.hasVisibleFields = this.visibleGeneralFields.length > 0;

    if (!this.title) {
      this.title = this.translate('search_title');
    }

    this.entity = this.formService.getEntityFromFields(this.cacheFields);

    const activatedRoute = this.injector.get(ActivatedRoute, null);
    const queryParams = activatedRoute?.snapshot?.queryParams;
    if (queryParams) {
      this.cacheFields.forEach(field => {
        if (queryParams[field.key] !== undefined && queryParams[field.key] !== null && queryParams[field.key] !== '') {
          this.entity[field.key] = queryParams[field.key];
          field.value = queryParams[field.key];
        }
      });
    }
  }

  private getGeneralFields(fields: DynamicField<any>[]): DynamicField<any>[] {
    const baseFilterFields = fields.filter(f => f.options?.baseFilter);

    if (baseFilterFields.length > 0) {
      return baseFilterFields;
    }

    fields.forEach(field => {
      if (field) {
        field.options = { ...field.options, baseFilter: true };
      }
    });
    return fields;
  }

  onChangeEntity(entityUpdate: any): void {
    this.entity = { ...this.entity, ...entityUpdate };
    this.updateActiveFilterCount();
  }

  clearForm(): void {
    const subForm = this.form.get('subForm');
    if (subForm) {
      subForm.reset();
    }

    this.entity = {};

    this.displayedColumnsChange.emit([...this.initialDisplayableColumns]);
    this.initializeColumnVisibility();

    this.onSubmitSearch(false);
  }

  resetToDefaults(): void {
    const defaults = this.formService.getEntityFromFields(this.cacheFields);
    const subForm = this.form.get('subForm');
    if (subForm) {
      subForm.reset(defaults, { emitEvent: false });
    } else {
      this.form.reset(defaults, { emitEvent: false });
    }
    this.entity = { ...defaults };
    this.updateActiveFilterCount();
  }

  patchValue(entity: any): void {
    if (!entity) return;
    const subForm = this.form.get('subForm');
    if (subForm) {
      subForm.patchValue(entity, { emitEvent: false });
    } else {
      this.form.patchValue(entity, { emitEvent: false });
    }
    this.entity = { ...this.entity, ...entity };
    this.updateActiveFilterCount();
    this._cdr.markForCheck();
  }

  onSubmitSearch(closePanel: boolean = true): void {
    const subForm = this.form.get('subForm') as FormGroup;

    if (subForm) {
      this.entity = { ...this.entity, ...this.formService.injectToEntity({}, subForm, this.visibleGeneralFields) };
    }

    if (!this.firstSubmitForced) {
      this.firstSubmitForced = true;
    }

    this.onChangeSearchEntity.emit(this.entity);
    this.updateActiveFilterCount();

    if (closePanel && this.searchPanel) {
      setTimeout(() => {
        this.searchPanel.close();
        this._cdr.markForCheck();
      }, 0);
    }
  }

  submitOnEnter(event: KeyboardEvent): void {
    if (this.form.valid && event.key === 'Enter') {
      event.preventDefault();
      this.onSubmitSearch();
    }
  }

  hasOptions(): boolean {
    return this.fieldsOptions && this.fieldsOptions.length > 0;
  }

  userChangeOptions(): boolean {
    if (!this.fieldsOptions || !this.entity) {
      return false;
    }

    return this.fieldsOptions.some(field => {
      const value = this.entity[field.key];

      if (field.controlType === 'checkbox') {
        return value === true;
      }

      return value != null && value !== '';
    });
  }

  openOptions(): void {
    if (!this.i18n) {
      console.error('[FWK] El objeto de internacionalización (i18n) no está definido.');
      return;
    }

    const formDef = {
      key: 'searchOptions',
      fields: this.fieldsOptions
    };

    const dialogRef = this.dialogService.showFormDialog({
      i18n: this.i18n,
      formDef: formDef,
      entity: this.entity,
      modalName: this.translate('search_modal_title'),
      onSubmit: (entity: any) => {
        this.onChangeEntity(entity);
        this.onSubmitSearch();
        dialogRef.close();
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this._cdr.markForCheck();
    });
  }

  private updateActiveFilterCount(): void {
    if (!this.entity || !this.fields) {
      this.activeFilterCount = 0;
      this._cdr.markForCheck();
      return;
    }

    const transferTargets = new Set<string>();
    this.fields.forEach(field => {
      const opts = field.options as any;
      if (opts?.transferIdToField) {
        transferTargets.add(opts.transferIdToField);
      }
    });

    this.activeFilterCount = this.fields.reduce((count, field) => {
      const value = this.entity[field.key];

      if (transferTargets.has(field.key)) {
        const sourceField = this.fields.find(f => (f.options as any)?.transferIdToField === field.key);
        const sourceValue = sourceField ? this.entity[sourceField.key] : null;
        if (sourceValue !== null && sourceValue !== undefined && sourceValue !== '') {
          return count;
        }
      }

      if (field.controlType === 'checkbox') {
        if (value === true) {
          return count + 1;
        }
        return count;
      }

      if (value !== null && value !== undefined && value !== '') {
        return count + 1;
      }

      return count;
    }, 0);

    this._cdr.markForCheck();
  }

  private _checkColumnsAltered(): void {
    if (!this.initialDisplayableColumns || !this.columnsDef) {
      this.columnsAltered = false;
      return;
    }

    const currentVisibleColumns = this.columnsDef
      .filter(col => this.columnVisibility.get(col.columnDef))
      .map(col => col.columnDef);

    const initialSorted = [...this.initialDisplayableColumns].sort();
    const currentSorted = [...currentVisibleColumns].sort();

    this.columnsAltered = JSON.stringify(initialSorted) !== JSON.stringify(currentSorted);
  }
}