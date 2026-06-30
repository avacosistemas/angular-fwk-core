import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { BaseService } from '../base-service/base.service';
import { I18nService } from '../i18n-service/i18n.service';
import { I18n } from '../../model/i18n';
import { CustomNotificationComponent } from '../../components/custom-notification/custom-notification.component';

export const NOTIFICATION_OPTS: MatSnackBarConfig = {
  duration: 5000,
  horizontalPosition: 'start',
  verticalPosition: 'bottom',
  panelClass: 'custom-notification-panel'
};

@Injectable({
  providedIn: 'root'
})
export class NotificationService extends BaseService {
  i18n?: I18n;

  constructor(
    private snackBar: MatSnackBar,
    public i18nService: I18nService
  ) {
    super();
  }

  notify(message: string): void {
    const config = { 
        ...NOTIFICATION_OPTS,
        data: { message, type: 'info' }
    };
    this.snackBar.openFromComponent(CustomNotificationComponent, config);
  }

  notifyError(message: string): void {
    const config = { 
        ...NOTIFICATION_OPTS,
        data: { message, type: 'error' }
    };
    this.snackBar.openFromComponent(CustomNotificationComponent, config);
  }

  notifySuccess(message: string): void {
    const config = { 
        ...NOTIFICATION_OPTS,
        data: { message, type: 'success' }
    };
    this.snackBar.openFromComponent(CustomNotificationComponent, config);
  }
}