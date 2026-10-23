import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RatingDialogComponent, RatingDialogResult } from './rating-dialog.component';
import { ActionDef } from '../../model/component-def/action-def';
import { GenericHttpService } from '../../services/generic-http-service/generic-http.service';
import { SpinnerService } from '../../modules/spinner/service/spinner.service';
import { NotificationService } from '../../services/notification/notification.service';
import { I18nService } from '../../services/i18n-service/i18n.service';

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  constructor(
    private dialog: MatDialog,
    private genericHttpService: GenericHttpService,
    private spinnerService: SpinnerService,
    private notificationService: NotificationService,
    private i18nService: I18nService,
  ) {}

  openRatingDialog(
    action: ActionDef,
    entity: any,
    maxStars: number,
    idKey: string,
    dictionaryName: string,
    onSuccess: () => void
  ): void {
    const title = action.titleKey 
      ? this.i18nService.translate(action.titleKey, dictionaryName) 
      : (action.title || this.i18nService.translate('rating_dialog_title'));
      
    const message = action.confirmMessageKey 
      ? this.i18nService.translate(action.confirmMessageKey, dictionaryName) 
      : (action.confirmMessage || this.i18nService.translate('rating_dialog_message'));

    const subtitle = action.titleField && entity?.[action.titleField] 
      ? entity[action.titleField] 
      : (entity?.titulo || entity?.nombre || entity?.name || '');

    const commentLabel = action.commentLabelKey
      ? this.i18nService.translate(action.commentLabelKey, dictionaryName)
      : undefined;

    const commentPlaceholder = action.commentPlaceholderKey
      ? this.i18nService.translate(action.commentPlaceholderKey, dictionaryName)
      : undefined;

    const dialogRef = this.dialog.open(RatingDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      panelClass: 'control-mat-dialog',
      data: {
        maxStars,
        title,
        message,
        subtitle,
        showComment: !!action.showComment,
        commentLabel,
        commentPlaceholder
      }
    });

    dialogRef.afterClosed().subscribe((res: RatingDialogResult | number | undefined) => {
      const rating = typeof res === 'object' ? res?.rating : res;
      const comentarios = typeof res === 'object' ? res?.comentarios : undefined;

      if (rating !== undefined && rating > 0) {
        if (action.ws && action.ws.url) {
          const spinner = this.spinnerService.getControlGlobalSpinner();
          spinner.show();
          const payload: any = {
            id: entity[idKey],
            valoracion: rating
          };
          if (comentarios !== undefined) {
            payload.comentarios = comentarios;
          }
          this.genericHttpService.callWs(action.ws, payload).subscribe({
            next: () => {
              onSuccess();
              const successMsg = this.i18nService.translate('success_message', 'fwk');
              this.notificationService.notifySuccess(successMsg);
            },
            complete: () => {
              spinner.hide();
            }
          });
        } else {
          console.log('Valoración guardada (mock):', rating, 'comentarios:', comentarios, 'para entidad:', entity);
          this.notificationService.notifySuccess(this.i18nService.translate('rating_saved_mock'));
          entity.valoracion = rating;
          if (comentarios !== undefined) {
            entity.comentarios = comentarios;
          }
          onSuccess();
        }
      }
    });
  }
}
