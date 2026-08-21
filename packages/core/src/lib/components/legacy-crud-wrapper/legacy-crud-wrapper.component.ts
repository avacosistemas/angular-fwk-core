import { Component, OnInit, ChangeDetectorRef, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, Subject, takeUntil, map, finalize } from 'rxjs';

import { CrudComponent } from '../crud/crud.component';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { BackButtonComponent } from '../back-button/back-button.component';
import { HelpButtonComponent } from '../help-button/help-button.component';
import { BreadcrumbComponent } from '../../navigation/breadcrumb/breadcrumb.component';
import { CrudDef } from '../../model/component-def/crud-def';
import { BaseCrudService } from '../../services/base-crud-service/base.crud.service';
import { GenericHttpService } from '../../services/generic-http-service/generic-http.service';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { I18nService } from '../../services/i18n-service/i18n.service';
import { FwkConfig, FWK_CONFIG } from '../../model/fwk-config';
import { DynamicField } from '../../model/dynamic-form/dynamic-field';
import { DynamicFieldBehavior } from '../../model/dynamic-form/dynamic-field-behavior';
import { I18n } from '../../model/i18n';
import { ActionDefService } from '../../services/action-def-service/action-def.service';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { FwkAlertComponent } from '../../layout/infrastructure/components/alert/alert.component';

@Component({
  selector: 'fwk-legacy-crud-wrapper',
  templateUrl: './legacy-crud-wrapper.component.html',
  styleUrls: ['./legacy-crud-wrapper.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CrudComponent,
    DynamicFormComponent,
    BackButtonComponent,
    HelpButtonComponent,
    BreadcrumbComponent,
    TranslatePipe,
    FwkAlertComponent
  ],
  providers: [GenericHttpService, BaseCrudService],
  host: { 'class': 'flex flex-auto h-full' }
})
export class LegacyCrudWrapperComponent implements OnInit, OnDestroy {

  crudDef!: CrudDef;
  
  contactEntity: any = null;
  formFields: DynamicField<any>[] = [];
  fieldsBehavior: DynamicFieldBehavior[] = [];
  isEditing: boolean = false;
  isEditingInit: boolean = false;
  parentForm = new FormGroup({});
  showEditButton: boolean = false;
  idContact: string | null = null;
  renderForm: boolean = true;
  isLoading: boolean = false;
  isSaving: boolean = false;
  isInlineViewActive: boolean = false;
  activeActionKey: string | null = null;
  inlineFileUrl: any = null;
  isInlineFileLoading: boolean = false;
  hasLoadError: boolean = false;
  errorType: 'network' | 'server' = 'server';

  private route = inject(ActivatedRoute);
  private _router = inject(Router);
  private _location = inject(Location);
  private cdr = inject(ChangeDetectorRef);
  private _sanitizer = inject(DomSanitizer);
  private _genericHttpService = inject(GenericHttpService);
  private _authService = inject(AuthService);
  private _notificationService = inject(NotificationService);
  private _i18nService = inject(I18nService);
  private _actionDefService = inject(ActionDefService);
  private _fwkConfig = inject<FwkConfig>(FWK_CONFIG);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.crudDef = this.route.snapshot.data['definition'];

    if (!this.crudDef) {
      console.error('[LegacyCrudWrapper] No se pudo obtener CrudDef desde los datos de la ruta.');
      return;
    }

    if (this.crudDef.i18n) {
      this._i18nService.addI18n(this.crudDef.i18n);
    }

    const isStandaloneForm = !this.crudDef.grid && (
      !!this.crudDef.formsDef?.read || !!this.crudDef.formsDef?.update ||
      !!this.crudDef.forms?.read || !!this.crudDef.forms?.update
    );

    if (this.crudDef.clusterConfig?.showDetailsFormInline === true || isStandaloneForm) {
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
        const newId = params['idContact'];
        const newAction = params['action'] || null;
        
        const actionChanged = this.activeActionKey !== newAction;
        this.activeActionKey = newAction;

        if (newId || this.crudDef.clusterConfig?.showDetailsFormInline === true || isStandaloneForm) {
          this.idContact = newId || null;
          
          this._evaluateInlineView();
          
          if (actionChanged) {
            this.renderForm = false;
            this.parentForm = new FormGroup({});
            this.inlineFileUrl = null;
            this.isInlineFileLoading = false;
            this.cdr.markForCheck();
          }

          this._loadContactData();
        } else {
          this.isInlineViewActive = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.isInlineViewActive = false;
      this.cdr.markForCheck();
    }

    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _evaluateInlineView(): void {
    const def = this.crudDef;
    if (!def) {
      this.isInlineViewActive = false;
      return;
    }

    if (this.activeActionKey) {
      this.isInlineViewActive = true;
      this.isEditing = true;
      return;
    }

    const readFields = def.formsDef?.read?.fields || def.forms?.read;
    const updateFields = def.formsDef?.update?.fields || def.forms?.update;
    const createFields = def.formsDef?.create?.fields || def.forms?.create;

    const hasCreate = !!createFields && (createFields.length ?? 0) > 0;
    const hasRead = !!readFields && (readFields.length ?? 0) > 0;
    const hasUpdate = !!updateFields && (updateFields.length ?? 0) > 0;

    const isStandaloneForm = !def.grid && (hasRead || hasUpdate);

    if ((def.clusterConfig?.showDetailsFormInline === true || isStandaloneForm) && !hasCreate && (hasRead || hasUpdate)) {
      this.isInlineViewActive = true;
      
      if (!this.isEditingInit) {
        this.isEditingInit = true;
        if (hasRead && hasUpdate) {
          this.isEditing = false;
        } else if (hasUpdate && !hasRead) {
          this.isEditing = true;
        } else if (hasRead && !hasUpdate) {
          this.isEditing = false;
        }
      }
    } else {
      this.isInlineViewActive = false;
    }
  }

  goBack(): void {
    this._location.back();
  }

  retryLoad(): void {
    this._loadContactData();
  }

  private _loadContactData(): void {
    const def = this.crudDef;
    if (!def) return;

    if (def.cancelInitSearch) {
      this.contactEntity = {};
      this.isLoading = false;
      this.hasLoadError = false;
      this._evaluateInlineView();
      this._setupFormFields();
      setTimeout(() => {
        this.renderForm = true;
        this.cdr.markForCheck();
      });
      return;
    }

    this.isLoading = true;
    this.hasLoadError = false;
    this.errorType = 'server';
    this.cdr.markForCheck();

    let url = def.ws?.url || (this._fwkConfig.apiBaseUrl! + 'admin/personas');
    if (def.ws?.url && !def.ws.url.startsWith('http') && !def.ws.url.startsWith('/assets/') && !def.ws.url.startsWith('assets/')) {
      url = this._fwkConfig.apiBaseUrl! + def.ws.url;
    }
    const params = this.idContact ? { idContact: this.idContact } : {};
    this._genericHttpService.basicGet(url, params, null, { idContact: 'idContact' })
      .subscribe({
        next: (res) => {
          if (res && res.ok === false) {
            this.hasLoadError = true;
            this.errorType = 'server';
            this.isLoading = false;
            setTimeout(() => {
              this.renderForm = true;
              this.cdr.markForCheck();
            });
            return;
          }
          const raw = res?.data !== undefined ? res.data : res;
          const array = Array.isArray(raw) ? raw : [raw];
          if (array.length > 0 && array[0] !== null && array[0] !== undefined) {
            if (typeof array[0] !== 'object') {
              const updateFields = def.formsDef?.update?.fields || def.forms?.update;
              const firstKey = (updateFields && updateFields.length > 0) ? updateFields[0].key : 'value';
              this.contactEntity = { [firstKey]: array[0] };
            } else {
              this.contactEntity = array[0];
            }
            
            this._evaluateInlineView();

            if (this.isInlineViewActive) {
              const hasUpdate = !!def.forms?.update || !!def.formsDef?.update;
              const hasRead = !!def.forms?.read || !!def.formsDef?.read;
              const hasUpdatePerm = !def.security?.updateAccess || this._authService.hasPermission(def.security.updateAccess);
              
              this.showEditButton = hasRead && hasUpdate && hasUpdatePerm;

              this._setupFormFields();
            }
            this.hasLoadError = false;
          } else {
            this.hasLoadError = true;
            this.errorType = 'server';
          }
          this.isLoading = false;
          setTimeout(() => {
            this.renderForm = true;
            this.cdr.markForCheck();
          });
        },
        error: (err) => {
          console.error('[LegacyCrudWrapper] Error loading contact data:', err);
          const hasUpdateOnly = (!!def.formsDef?.update || !!def.forms?.update) && !def.formsDef?.read && !def.forms?.read;
          if (hasUpdateOnly) {
            this.contactEntity = {};
            this.hasLoadError = false;
            this.isLoading = false;
            this._evaluateInlineView();
            this._setupFormFields();
            setTimeout(() => {
              this.renderForm = true;
              this.cdr.markForCheck();
            });
            return;
          }
          this.hasLoadError = true;
          if (!navigator.onLine || err?.status === 0 || err?.name === 'TimeoutError' || err?.message?.includes('Unknown Error')) {
            this.errorType = 'network';
          } else {
            this.errorType = 'server';
          }
          this.isLoading = false;
          setTimeout(() => {
            this.renderForm = true;
            this.cdr.markForCheck();
          });
        }
      });
  }

  private _setupFormFields(): void {
    const def = this.crudDef;
    if (!def) return;
    this.inlineFileUrl = null;

    let currentActionDef: any = null;
    if (this.activeActionKey && def.clusterConfig?.actionsItems) {
      currentActionDef = def.clusterConfig.actionsItems.find(
        (a: any) => a.actionNameKey === this.activeActionKey
      );
    }

    if (currentActionDef) {
      if (currentActionDef.actionType === 'file_preview') {
        this._loadInlineFilePreview(currentActionDef);
        this.formFields = [];
      } else if (currentActionDef.form) {
        this.formFields = JSON.parse(JSON.stringify(currentActionDef.form));
        this.formFields.forEach(field => {
          if (field.disabled === undefined) {
            field.disabled = false;
          }
          if (field.readonly === undefined) {
            field.readonly = false;
          }
        });
      } else {
        this.formFields = [];
      }
    } else {
      const readFields = def.formsDef?.read?.fields || def.forms?.read;
      const updateFields = def.formsDef?.update?.fields || def.forms?.update;
      const hasRead = !!readFields && (readFields.length ?? 0) > 0;
      const hasUpdate = !!updateFields && (updateFields.length ?? 0) > 0;

      if (this.isEditing && hasUpdate && updateFields) {
        this.formFields = JSON.parse(JSON.stringify(updateFields));
        this.formFields.forEach(field => {
          if (field.key !== 'idContact') {
            field.readonly = false;
            if (field.disabled === undefined) {
              field.disabled = false;
            }
          }
        });
      } else if (hasRead && readFields) {
        this.formFields = JSON.parse(JSON.stringify(readFields));
        this.formFields.forEach(field => {
          field.readonly = true;
          field.disabled = true;
        });
      } else {
        this.formFields = [];
      }
    }

    const dictName = this.crudDef?.i18n?.name || 'perfil_identificacion_i18n_def';
    const dictionary = this._i18nService.getDictionary(dictName) || 
                       this._i18nService.getDictionary('fwk');
    if (dictionary) {
      this.formFields.forEach(field => {
        if (field.labelKey) {
          field.label = dictionary.translate?.(field.labelKey) || this._i18nService.translate(field.labelKey) || field.label;
        }
      });
    }

    this.fieldsBehavior = def.formsDef?.update?.fieldsBehavior || def.formsDef?.read?.fieldsBehavior || [];

    this.cdr.markForCheck();
  }

  startEditing(): void {
    this.isEditing = true;
    this.parentForm = new FormGroup({});
    this.renderForm = false;
    this._setupFormFields();
    setTimeout(() => {
      this.renderForm = true;
      this.cdr.markForCheck();
    });
  }

  cancelEditing(): void {
    const def = this.crudDef;
    const readFields = def?.formsDef?.read?.fields || def?.forms?.read;
    const hasRead = !!readFields && (readFields.length ?? 0) > 0;
    if (!this.activeActionKey && hasRead) {
      this.isEditing = false;
    }
    this.parentForm = new FormGroup({});
    this.renderForm = false;
    
    this._evaluateInlineView();
    this._setupFormFields();
    
    this._loadContactData();
    
    setTimeout(() => {
      this.renderForm = true;
      this.cdr.markForCheck();
    });
  }

  get pageTitle(): string {
    const def = this.crudDef;
    if (!def) return '';
    if (this.activeActionKey) {
      return this.translate(this.activeActionKey);
    }
    const dictName = def.i18n?.name;
    const dictionary = dictName ? this._i18nService.getDictionary(dictName) : null;
    const nameLower = def.name ? def.name.toLowerCase() : '';

    const possibleKeys = [
      'page_title',
      `${nameLower}_title`,
      `${def.name}_title`,
      (def as any).titleKey
    ].filter(Boolean) as string[];

    for (const key of possibleKeys) {
      const translated = dictionary?.translate?.(key) || this._i18nService.translate(key) || def.i18n?.words?.[key];
      if (translated && translated !== key) {
        return translated;
      }
    }

    if ((def as any).title) {
      return (def as any).title;
    }

    return this.isEditing ? this.translate('cluster_edit_details_title') : this.translate('cluster_details_title');
  }

  get isSaveDisabled(): boolean {
    return this.parentForm.invalid || this.isSaving || this.parentForm.disabled;
  }

  saveChanges(): void {
    const def = this.crudDef;
    if (this.parentForm.invalid || !this.contactEntity || !def) return;

    const subForm = this.parentForm.get('subForm');
    const formValues = subForm ? subForm.value : {};
    
    let updatedEntity: any = {};
    if (this.activeActionKey) {
      updatedEntity = { ...formValues };
      if (this.idContact) {
        updatedEntity.id = this.idContact;
        updatedEntity.idContact = this.idContact;
      }
    } else {
      const row = { ...this.contactEntity };
      row.id = row.idContact;
      updatedEntity = { ...row, ...formValues };
    }

    let url = def.ws?.url || (this._fwkConfig.apiBaseUrl! + 'admin/personas');
    let method = 'PUT';

    let currentActionDef: any = null;
    if (this.activeActionKey && def.clusterConfig?.actionsItems) {
      currentActionDef = def.clusterConfig.actionsItems.find(
        (a: any) => a.actionNameKey === this.activeActionKey
      );
    }

    if (currentActionDef && currentActionDef.ws) {
      url = currentActionDef.ws.url;
      method = currentActionDef.ws.method || 'PUT';
    }

    let request$: Observable<any>;
    if (method === 'POST') {
      request$ = this._genericHttpService.basicPost(url, updatedEntity);
    } else if (method === 'DELETE') {
      request$ = this._genericHttpService.basicDelete(url, updatedEntity);
    } else {
      request$ = this._genericHttpService.basicPut(url, updatedEntity);
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    request$.subscribe({
      next: (res) => {
        this.isSaving = false;
        const successMsg = def.ws?.messageSuccess || res?.messageSuccess || res?.successMessage || res?.data?.successMessage || this.translate('success_message') || this.translate('data_update_success_message');
        this._notificationService.notifySuccess(successMsg);
        this._notificationService.checkAndNotifyExtraMessages(res);
        
        if (this.activeActionKey) {
          this.parentForm = new FormGroup({});
          this.renderForm = false;
          this._loadContactData();
        } else {
          const readFields = def.formsDef?.read?.fields || def.forms?.read;
          const hasRead = !!readFields && (readFields.length ?? 0) > 0;
          this.isEditing = !hasRead;
          this.parentForm = new FormGroup({});
          this.renderForm = false;
          this._evaluateInlineView();
          this._setupFormFields();
          this._loadContactData();
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('[LegacyCrudWrapper] Error saving data:', err);
        this.cdr.markForCheck();
      }
    });
  }

  get activeInnerActions(): any[] {
    const def = this.crudDef;
    if (!def) return [];

    let currentActionDef: any = null;
    if (this.activeActionKey && def.clusterConfig?.actionsItems) {
      currentActionDef = def.clusterConfig.actionsItems.find(
        (a: any) => a.actionNameKey === this.activeActionKey
      );
    }

    if (currentActionDef && currentActionDef.actions) {
      return currentActionDef.actions.filter((action: any) => {
        if (action.actionSecurity && !this._authService.hasPermission(action.actionSecurity)) {
          return false;
        }
        return true;
      });
    }

    return [];
  }

  private _prepareAction(action: any): any {
    const cloned = JSON.parse(JSON.stringify(action));
    
    if (cloned.actionNameKey) {
      cloned.actionName = this._i18nService.translate(cloned.actionNameKey);
    }
    
    if (cloned.confirm) {
      if (typeof cloned.confirm === 'object') {
        if (cloned.confirm.messageKey) {
          const trans = this._i18nService.translate(cloned.confirm.messageKey);
          cloned.confirm.message = trans !== cloned.confirm.messageKey ? trans : (cloned.confirm.message || this.translate('confirm_operation_default_message'));
        }
      } else if (cloned.confirm === true) {
        const confirmKey = cloned.confirmMessageKey || cloned.confirmMessage;
        let transMsg = this.translate('confirm_operation_default_message');
        if (confirmKey) {
          const trans = this._i18nService.translate(confirmKey);
          transMsg = trans !== confirmKey ? trans : (cloned.confirmMessage || transMsg);
        }
        cloned.confirm = {
          message: transMsg
        };
      }
    }
    
    if (cloned.form) {
      cloned.form.forEach((field: any) => {
        if (field.labelKey) {
          field.label = this._i18nService.translate(field.labelKey);
        }
      });
    }
    
    return cloned;
  }

  executeInnerAction(action: any): void {
    if (!this.contactEntity) return;

    const preparedAction = this._prepareAction(action);
    const row = { ...this.contactEntity };
    row.id = row.idContact;

    const dictName = this.crudDef?.i18n?.name || 'perfil_identificacion_i18n_def';
    const i18nObj = this._i18nService.getDictionary(dictName) || 
                    this._i18nService.getDictionary('fwk') || 
                    new I18n();

    this.isSaving = true;
    this.cdr.markForCheck();

    this._actionDefService.submitAction(preparedAction, row, i18nObj, undefined)
      .subscribe({
        next: (res) => {
          this.isSaving = false;
          if (res === null) {
            this.cdr.markForCheck();
            return;
          }
          if (res && res.hasOwnProperty('ok') && !res.ok) {
            const errorMsg = preparedAction.ws?.messageError || res.error?.message || this.translate('action_error_default_message');
            this._notificationService.notifyError(errorMsg);
            this.cdr.markForCheck();
            return;
          }
          const successMsg = preparedAction.ws?.messageSuccess || this.translate('success_message') || this.translate('action_success_default_message');
          this._notificationService.notifySuccess(successMsg);
          
          this.parentForm = new FormGroup({});
          this.renderForm = false;
          const redirectPath = preparedAction.redirectToSuccess || preparedAction.redirectTo;
          if (redirectPath) {
            this._router.navigateByUrl(redirectPath);
          } else {
            this._loadContactData();
          }
        },
        error: (err) => {
          this.isSaving = false;
          console.error('[LegacyCrudWrapper] Error executing inner action:', err);
          const msg = preparedAction.ws?.messageError || err?.error?.message || this.translate('action_execution_error_message');
          this._notificationService.notifyError(msg);
          this.cdr.markForCheck();
        }
      });
  }

  translate(key: string): string {
    if (!key) return '';
    const dictName = this.crudDef?.i18n?.name || 'app';
    return this._i18nService.translate(key, dictName);
  }

  private _loadInlineFilePreview(action: any): void {
    if (!action.ws || !this.idContact) return;

    this.inlineFileUrl = null;
    this.isInlineFileLoading = true;
    this.cdr.markForCheck();

    const row = { ...this.contactEntity };
    row.id = row.idContact || this.idContact;
    row.idContact = row.idContact || this.idContact;

    const ws = JSON.parse(JSON.stringify(action.ws));
    ws.method = 'GET';

    const currentActionKey = action.actionNameKey;

    this._genericHttpService.callWs(ws, row).pipe(
      map((response: any) => {
        if (Array.isArray(response) && response.length > 0) {
          return response[0];
        }
        return response;
      }),
      finalize(() => {
        if (this.activeActionKey === currentActionKey) {
          this.isInlineFileLoading = false;
          this.cdr.markForCheck();
        }
      })
    ).subscribe({
      next: (fileEntity: any) => {
        if (this.activeActionKey === currentActionKey && fileEntity && fileEntity.file) {
          const extension = fileEntity.fileName?.split('.').pop()?.toLowerCase() ?? 'pdf';
          const mimeTypes: { [key: string]: string } = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', pdf: 'application/pdf'
          };
          const mimeType = mimeTypes[extension] || 'application/pdf';
          const rawUrl = `data:${mimeType};base64,${fileEntity.file}`;
          this.inlineFileUrl = this._sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('[LegacyCrudWrapper] Error loading inline file preview:', err);
        if (this.activeActionKey === currentActionKey) {
          this._notificationService.notifyError(this.translate('file_preview_load_error_message'));
        }
      }
    });
  }
}