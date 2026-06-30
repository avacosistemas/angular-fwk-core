import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RatingDialogComponent } from './rating-dialog.component';
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

    const dialogRef = this.dialog.open(RatingDialogComponent, {
      width: '350px',
      maxWidth: '95vw',
      panelClass: 'control-mat-dialog',
      data: {
        maxStars,
        title,
        message
      }
    });

    dialogRef.afterClosed().subscribe((rating: number | undefined) => {
      if (rating !== undefined && rating > 0) {
        if (action.ws && action.ws.url) {
          const spinner = this.spinnerService.getControlGlobalSpinner();
          spinner.show();
          const payload = {
            id: entity[idKey],
            valoracion: rating
          };
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
          console.log('Valoración guardada (mock):', rating, 'para entidad:', entity);
          this.notificationService.notifySuccess(this.i18nService.translate('rating_saved_mock'));
          entity.valoracion = rating;
          onSuccess();
        }
      }
    });
  }
}
