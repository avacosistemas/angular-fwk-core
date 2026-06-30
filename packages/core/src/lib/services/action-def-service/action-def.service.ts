import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError, finalize, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { SpinnerService } from '../../modules/spinner/service/spinner.service';
import { GenericHttpService } from '../generic-http-service/generic-http.service';
import { FileService } from '../file/file.service';
import { DialogService } from '../dialog-service/dialog.service';
import { ComponentDefService } from '../component-def-service/component-def.service';
import { ExpressionService } from '../expression-service/expression.service';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { NotificationService } from '../notification/notification.service';
import { ActionDef, ACTION_TYPES } from '../../model/component-def/action-def';
import { DisplayActionsCondition } from '../../model/display-actions-condition';
import { I18n } from '../../model/i18n';

@Injectable({
  providedIn: 'root'
})
export class ActionDefService {
  private spinnerGeneralControl: any;

  constructor(
    private spinnerService: SpinnerService,
    private genericHttpService: GenericHttpService,
    private router: Router,
    private fileService: FileService,
    private componentDefService: ComponentDefService,
    private expressionService: ExpressionService,
    private localStorageService: LocalStorageService,
    private notificationService: NotificationService,
    private dialogService: DialogService
  ) {
    this.spinnerGeneralControl = spinnerService.getControlGlobalSpinner();
  }

  getActions(conditions: DisplayActionsCondition[], actions: ActionDef[], data: any): ActionDef[] {
    if (!actions) return [];

    return actions.filter(action => {
      if (conditions) {
        const condition = conditions.find(c => c.key === action.actionNameKey);
        if (condition) {
          return this.expressionService.evaluate(condition.expression, data);
        }
      }
      return true;
    });
  }

  submitAction(action: ActionDef, entity: any, i18n: I18n, dialogConfig: any): Observable<any> {
    switch (action.actionType) {
      case ACTION_TYPES.notification:
        return this.handleNotificationAction(action);
      case ACTION_TYPES.redirect:
        return this.handleRedirectAction(action, entity);
      case ACTION_TYPES.html_modal:
        return this.handleHtmlModalAction(action, entity, i18n, dialogConfig);
      case ACTION_TYPES.form_modal:
        return this.handleFormModalAction(action, entity, i18n, dialogConfig);
      case ACTION_TYPES.grid_modal:
        return this.handleGridModalAction(action, entity);
      case ACTION_TYPES.file_download:
        return this.handleFileDownloadAction(action, entity);
      case ACTION_TYPES.file_preview:
        return this.handleFilePreviewAction(action, entity);
      default:
        return this.handleDefaultAction(action, entity);
    }
  }

  private handleNotificationAction(action: ActionDef): Observable<any> {
    const data = {
      html: action.input?.message,
      modalName: action.input?.modalName
    };
    return this.dialogService.openHtmlModal(data).afterClosed();
  }

  private handleRedirectAction(action: ActionDef, entity: any): Observable<any> {
    let url = '';
    if (action.redirect?.externalUrl) {
      url = action.input;
    } else {
      url = this.componentDefService.getUrlNavById(action.input) ?? '/';
    }

    if (action.redirect?.openTab) {
      window.open(url, '_blank')?.focus();
      return of({ success: true });
    } else {
      return of(this.router.navigateByUrl(url));
    }
  }

  private handleHtmlModalAction(action: ActionDef, entity: any, i18n: I18n, dialogConfig: any): Observable<any> {
    if (!action.htmlModal) return of(null);

    const data = {
      html: entity[action.htmlModal.attributeMapping],
      i18n: i18n,
    };
    return this.dialogService.openHtmlModal(data, dialogConfig).afterClosed();
  }

  private handleFormModalAction(action: ActionDef, entity: any, i18n: I18n, dialogConfig: any): Observable<any> {
    return this.dialogService.showFormDialog({
      i18n,
      formDef: { key: action.formKey, fields: action.form, submitWs: action.ws },
      entity: entity,
      dialogConfig: dialogConfig,
      modalName: action.actionName
    }).afterClosed();
  }

  private handleGridModalAction(action: ActionDef, entity: any): Observable<any> {
    if (action.gridModal) {
      this.dialogService.showGridModal({
      title: action.actionName ?? '',
        entities: entity[action.gridModal.fromArrayField],
        gridDef: action.gridModal.gridDef
      });
    }
    return of({ success: true });
  }

  private handleFileDownloadAction(action: ActionDef, entity: any): Observable<any> {
    this.spinnerGeneralControl.show();
    return this.fileService.downloadFileByAction(action, entity).pipe(
      catchError(e => this.handleActionError(e)),
      finalize(() => this.spinnerGeneralControl.hide())
    );
  }

  private handleFilePreviewAction(action: ActionDef, entity: any): Observable<any> {
    this.spinnerGeneralControl.show();
    return this.fileService.previewFileByAction(action, entity).pipe(
      catchError(e => this.handleActionError(e)),
      finalize(() => this.spinnerGeneralControl.hide())
    );
  }

  private handleDefaultAction(action: ActionDef, entity: any): Observable<any> {
    if (action.confirm) {
      return this.handleConfirmAction(action, entity);
    }

    if (!action.ws) return of({ error: 'No WS defined' });

    this.spinnerGeneralControl.show();
    return this.genericHttpService.callWs(action.ws, entity).pipe(
      catchError(e => this.handleActionError(e, action)),
      finalize(() => this.spinnerGeneralControl.hide())
    );
  }

  private handleConfirmAction(action: ActionDef, entity: any): Observable<any> {
    let message = typeof action.confirm === 'object' ? action.confirm.message : undefined;

    if (message && entity) {
        Object.keys(entity).forEach(key => {
            const value = entity[key] !== undefined && entity[key] !== null ? entity[key] : '';
            const regex = new RegExp(`{{${key}}}|{${key}}`, 'g');
            message = message.replace(regex, String(value));
        });
    }

    const actionType = (action as any).type || (action.color === 'warn' ? 'warn' : undefined);
    
    let modalIconName = 'heroicons_outline:question-mark-circle';
    let modalIconColor: 'primary' | 'accent' | 'warn' | 'basic' | 'info' | 'success' = 'primary';
    let confirmBtnColor: 'primary' | 'accent' | 'warn' = 'primary';

    if (actionType === 'warn' || actionType === 'error') {
        modalIconName = 'heroicons_outline:exclamation-triangle';
        modalIconColor = 'warn';
        confirmBtnColor = 'warn';
    } else if (actionType === 'info') {
        modalIconName = 'heroicons_outline:information-circle';
        modalIconColor = 'info';
        confirmBtnColor = 'primary';
    } else if (actionType === 'success') {
        modalIconName = 'heroicons_outline:check-circle';
        modalIconColor = 'success';
        confirmBtnColor = 'accent';
    }

    return this.dialogService.showQuestionModal({
      title: action.actionName,
      message: message,
      icon: {
        show: true,
        name: modalIconName,
        color: modalIconColor
      },
      actions: {
        confirm: {
          show: true,
          color: confirmBtnColor
        },
        cancel: {
          show: true
        }
      },
      onSubmit: () => { },
      onReject: () => { }
    }).afterClosed().pipe(
      switchMap(confirmed => {
        if (confirmed === 'confirmed') {
          if (!action.ws) {
            const errorMsg = this.notificationService.i18nService.translate('action_no_ws_confirm');
            console.error('No WS defined for confirm action', action);
            this.notificationService.notifyError(errorMsg);
            return of({ error: errorMsg });
          }

          this.spinnerGeneralControl.show();
          return this.genericHttpService.callWs(action.ws, entity).pipe(
            catchError(e => this.handleActionError(e, action)),
            finalize(() => this.spinnerGeneralControl.hide())
          );
        }
        return of(null);
      })
    );
  }

  private handleActionError(e: any, action?: ActionDef): Observable<never> {
    const message = action?.ws?.messageError ?? e?.error?.message ?? this.notificationService.i18nService.translate('action_execution_generic_error');
    this.notificationService.notifyError(message);
    return throwError(() => new Error(message));
  }

  filterActionsByCondition(actions: ActionDef[], conditions: DisplayActionsCondition[], objList: any[]): ActionDef[] {
    if (!conditions || !actions) {
      return actions ?? [];
    }

    let filteredActions: ActionDef[] = this.localStorageService.clone(actions);
    objList.forEach(obj => {
      filteredActions = filteredActions.filter(action => {
        const condition = conditions.find(c => c.key === action.actionNameKey);
        return condition ? this.expressionService.evaluate(condition.expression, obj) : true;
      });
    });
    return filteredActions;
  }
}