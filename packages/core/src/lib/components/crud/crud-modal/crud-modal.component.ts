import { Component, Inject, ViewChild, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Injector } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AbstractComponent } from '../../abstract-component.component';
import { DynamicField } from '../../../model/dynamic-form/dynamic-field';
import { FormService } from '../../../services/dynamic-form/form.service';
import { DynamicFormComponent } from '../../dynamic-form/dynamic-form.component';
import { DynamicFieldBehavior } from '../../../model/dynamic-form/dynamic-field-behavior';
import { SpinnerService } from '../../../modules/spinner/service/spinner.service';
import { FormDef } from '../../../model/form-def';
import { ActionDef } from '../../../model/component-def/action-def';
import { ActionDefService } from '../../../services/action-def-service/action-def.service';
import { DialogService } from '../../../services/dialog-service/dialog.service';
import { FwkLoadingService } from '../../../layout/infrastructure/services/loading/loading.service';
import { of, finalize, Observable } from 'rxjs';

import { A11yModule } from '@angular/cdk/a11y';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { LocalStorageService } from '../../../services/local-storage/local-storage.service';

export const VALIDATIONS_ERRORS = 'VALIDATIONS_ERRORS';

@Component({
  selector: 'fwk-crud-modal-component',
  templateUrl: './crud-modal.component.html',
  styleUrls: ['./crud-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    DynamicFormComponent,
    A11yModule,
    TranslatePipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrudModalComponent extends AbstractComponent implements OnInit, AfterViewInit {
  @ViewChild('dynamicForm') dynamicForm!: DynamicFormComponent;

  form: FormGroup;
  entity: any;
  isAdd: boolean = false;
  isRead: boolean = false;
  submitting: boolean = false;
  isObjectModified: boolean = false;
  formDef: FormDef | undefined;
  handlerFieldSourceData: any;
  _fields: DynamicField<any>[] = [];
  _isEdit: boolean = false;
  loading$: Observable<boolean>;


  private fieldsBehavior: DynamicFieldBehavior[] | undefined;
  private customSubmitActions: ((action: ActionDef, entity: any) => void) | undefined;
  private formService: FormService;
  private spinnerService: SpinnerService;
  private globalSpinnerControl: any;
  private activatedRoute: ActivatedRoute;
  private actionDefService: ActionDefService;
  private dialogService: DialogService;
  private localStorageService: LocalStorageService;

  constructor(
    public injector: Injector,
    public dialogRef: MatDialogRef<CrudModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _cdr: ChangeDetectorRef,
  ) {
    super(injector);
    this.formService = injector.get(FormService);
    this.localStorageService = injector.get(LocalStorageService);
    this.spinnerService = injector.get(SpinnerService);
    this.activatedRoute = injector.get(ActivatedRoute);
    this.actionDefService = injector.get(ActionDefService);
    this.dialogService = injector.get(DialogService);
    this.loading$ = injector.get(FwkLoadingService).show$;
    this.i18nName = this.data.i18n?.name || 'fwk';

    this.dialogRef.disableClose = true;
    this.entity = this.localStorageService.clone(this.data.entity || {});
    this.formDef = this.data.formDef;
    this.isAdd = !!this.data.isAdd;
    this.isRead = !!this.data.isRead;
    this.isEdit = !!this.data.isEdit;
    this.customSubmitActions = this.data.submitActions;
    this.handlerFieldSourceData = this.data.handlerFieldSourceData;

    this.fields = this.formDef?.fields || this.data.fields || [];
    this.fieldsBehavior = this.formDef?.fieldsBehavior || this.data.fieldsBehavior;

    this.form = new FormGroup({});
  }

  ngAfterViewInit(): void {
    if (this.dynamicForm) {
      setTimeout(() => {
        if (this.dynamicForm.form) {
          this.dynamicForm.updateInitialState();
        }

        if (this.fieldsBehavior && this.fieldsBehavior.length > 0) {
          const uniqueTriggerFields = [...new Set(this.fieldsBehavior.map(fb => fb.fieldKey))];

          const subForm = this.form.get('subForm') as FormGroup;

          if (subForm) {
            uniqueTriggerFields.forEach(key => {
              this.formService.fieldChangeBehavior(
                key,
                this.fieldsBehavior!,
                this.entity,
                this.fields,
                subForm
              );
            });
          }
        }

        this._cdr.markForCheck();
      }, 0);
    }
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.globalSpinnerControl = this.spinnerService.getControlGlobalSpinner();
  }

  onNoClick(): void {
    const closeDialog = (): void => {
      this.dialogRef.close();
    };
    if (this.form.dirty && !this.isRead) {
      this.dialogService.showQuestionModal({
        title: this.translate('modal_close_warning_title'),
        message: this.translate('modal_close_warning_message'),
        actions: {
          confirm: {
            label: this.translate('modal_close_warning_confirm'),
            color: 'warn'
          },
          cancel: {
            label: this.translate('modal_close_warning_cancel')
          }
        },
        onSubmit: closeDialog,
      });
    } else {
      closeDialog();
    }
  }

  onChangeEntity(entity: any): void {
    const originalId = this.isEdit && this.entity ? this.entity['id'] : undefined;
    this.entity = { ...entity };
    if (originalId !== undefined) {
      this.entity['id'] = originalId;
    }
  }

  fieldsChanges(fields: DynamicField<any>[], data: any): void {
    const subForm = this.form.get('subForm');
    if (subForm instanceof FormGroup) {
      this.formService.fieldsChangesBehavior(fields, this.fieldsBehavior || [], data, subForm);
    }
  }

  submitAction(action: ActionDef): void {
    if (this.customSubmitActions) {
      this.customSubmitActions(action, this.entity);
    } else {
      this.actionDefService.submitAction(action, this.entity, this.data.i18n, undefined).subscribe();
    }
  }

  onSubmit(andContinue: boolean = false): void {
    if (this.form.invalid) {
      this.notificationService.notifyError(this.translate('form_error_correct_errors'));
      return;
    }

    this.submitting = true;
    this._cdr.markForCheck();

    const subForm = this.form.get('subForm') as FormGroup;

    if (subForm) {
      this.entity = this.formService.injectToEntity(this.entity, subForm, this.fields);
    } else {
      console.error('Error: No se encontró el subForm en CrudModal');
      this.submitting = false;
      return;
    }

    const operation = this.isAdd ? 'add' : 'edit';
    const validationMethod = this.isAdd ? 'validationAdd' : 'validationEdit';

    const validation$ = this.data.crud[validationMethod] ? this.data.crud[validationMethod](this.entity) : of(true);

    validation$.subscribe({
      next: () => {
        this.data.crud[operation](this.entity).pipe(
          finalize(() => {
            if (!andContinue) {
              this.submitting = false;
              this._cdr.markForCheck();
            }
          })
        ).subscribe({
          next: (response: any) => {

            if (response && response.ok === false && response.error) {
              this.notificationService.notifyError(response.error.message || this.translate('server_error_message'));
              this.submitting = false;
              this._cdr.markForCheck();
              return;
            }

            const isSuccess = !response ||
              response === true ||
              response.success === true ||
              (typeof response.success === 'undefined' && (response.id || response.ok === true));

            if (isSuccess) {
              this.notificationService.notifySuccess(this.translate('success_message'));

              if (andContinue) {
                if (this.isAdd) {
                  const persistentValues: any = {};
                  this.fields.forEach(f => {
                    if (f.mappingQuerystring || f.controlType === 'hidden') {
                      const controlValue = subForm?.get(f.key)?.value;
                      if (controlValue !== undefined) {
                        persistentValues[f.key] = controlValue;
                      }
                    }
                  });

                  this.entity = { ...this.newObjectEntity(), ...persistentValues };
                  delete this.entity.id;

                  if (subForm) {
                    subForm.reset();
                    subForm.patchValue(persistentValues);
                  }

                  if (this.dynamicForm) {
                    this.dynamicForm.entity = this.entity;
                    this.dynamicForm.updateInitialState();
                  }

                  this.isObjectModified = false;
                } else {
                  if (response && typeof response === 'object' && (response.id || response.Guid)) {
                    this.entity = { ...this.entity, ...response };
                  }

                  if (this.dynamicForm) {
                    this.dynamicForm.form.markAsPristine();
                    this.dynamicForm.updateInitialState();
                    if (response && typeof response === 'object') {
                      this.dynamicForm.form.patchValue(this.entity, { emitEvent: false });
                    }
                  }
                  this.isObjectModified = false;
                }

                this.submitting = false;
                this._cdr.markForCheck();
              } else {
                this.dialogRef.close({ response: response || true, entity: this.entity });
              }
            } else {
              this.notificationService.notifyError(response?.message || this.translate('unknown_error_message'));
              this.submitting = false;
              this._cdr.markForCheck();
            }
          },
          error: (error: any) => {
            this.handlerError(error);
            this.submitting = false;
            this._cdr.markForCheck();
          }
        });
      },
      error: (error: any) => {
        this.handlerError(error);
        this.submitting = false;
        this._cdr.markForCheck();
      }
    });
  }

  private newObjectEntity(): any {
    return {};
  }

  getActions(form: FormDef | undefined): ActionDef[] {
    if (!form?.actions) {
      return [];
    }
    return this.actionDefService.getActions(form.displayActionsCondition || [], form.actions, this.entity);
  }

  objectModified(isModified: boolean): void {
    this.isObjectModified = isModified;
    this._cdr.markForCheck();
  }

  handlerError(error: any): void {
    if (error?.error?.status === VALIDATIONS_ERRORS) {
      const subForm = this.form.get('subForm');
      if (subForm instanceof FormGroup) {
        this.formService.addErrorToFields(subForm, error.error.errors);
      }
      if (error.error.message) {
        this.notificationService.notifyError(error.error.message);
      }
    } else {
      this.notificationService.notifyError(this.translate('generic_error_try_again'));
    }
  }

  get titleLabel(): string {
    if (this.formDef?.title) { return this.formDef.title; }
    if (this.isAdd) { return this.translate('modal_add_title'); }
    if (this._isEdit) { return this.translate('modal_edit_title'); }
    return this.translate('modal_view_title');
  }

  get saveLabel(): string {
    if (this.isAdd) { return this.translate('modal_button_save'); }
    if (this._isEdit) { return this.translate('modal_button_save'); }
    return this.translate('modal_button_confirm');
  }

  get fields(): DynamicField<any>[] { return this._fields; }
  set fields(data: DynamicField<any>[]) { this._fields = data ? [...data] : []; }

  get isEdit(): boolean { return this.isAdd || this._isEdit; }
  set isEdit(value: boolean) { this._isEdit = value; }

  getFuncName(): string { return this.data.funcName || ''; }
  getUrl(): string { return this.activatedRoute.snapshot.children[0]?.routeConfig?.path || ''; }
}