import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

import { BaseService } from '../base-service/base.service';
import { I18nService } from '../i18n-service/i18n.service';
import { I18n } from '../../model/i18n';
import { CustomNotificationComponent } from '../../components/custom-notification/custom-notification.component';

export const NOTIFICATION_OPTS: MatSnackBarConfig = {
  horizontalPosition: 'start',
  verticalPosition: 'bottom',
  panelClass: 'custom-notification-panel'
};

export interface QueuedNotification {
  message: string;
  type: 'info' | 'error' | 'success' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService extends BaseService {
  i18n?: I18n;

  private queue: QueuedNotification[] = [];
  private isShowing = false;
  private currentMessage: string | null = null;

  constructor(
    private snackBar: MatSnackBar,
    public i18nService: I18nService
  ) {
    super();
  }

  notify(message: string, duration: number = 4000): void {
    this.enqueue({ message, type: 'info', duration });
  }

  notifyError(message: string, duration: number = 7000): void {
    this.enqueue({ message, type: 'error', duration });
  }

  notifySuccess(message: string, duration: number = 4000): void {
    this.enqueue({ message, type: 'success', duration });
  }

  notifyWarning(message: string, duration: number = 9000): void {
    this.enqueue({ message, type: 'warning', duration });
  }

  checkAndNotifyExtraMessages(response: any): void {
    if (!response) return;

    const warningMsg = response.warningMessage || response.warning || response.data?.warningMessage || response.data?.warning;
    const successMsg = response.successMessage || response.data?.successMessage;

    if (warningMsg && typeof warningMsg === 'string' && warningMsg.trim() !== '') {
      this.notifyWarning(warningMsg.trim());
    } else if (successMsg && typeof successMsg === 'string' && successMsg.trim() !== '') {
      this.notifySuccess(successMsg.trim());
    }
  }

  private enqueue(notification: QueuedNotification): void {
    if (!notification.message || notification.message.trim() === '') return;

    const trimmedMsg = notification.message.trim();

    if (this.currentMessage === trimmedMsg) return;
    const isAlreadyQueued = this.queue.some(q => q.message === trimmedMsg && q.type === notification.type);
    if (isAlreadyQueued) return;

    if (notification.type === 'error') {
      const isGenericFallback = [
        'Error al actualizar los datos',
        'Error al guardar los datos',
        'Ocurrió un error desconocido',
        'Ocurrió un error al procesar la solicitud',
        'http_error_generic',
        'data_update_error_message'
      ].some(generic => trimmedMsg.toLowerCase().includes(generic.toLowerCase()));

      const hasErrorActiveOrQueued = (this.isShowing && this.queue.length >= 0) || this.queue.some(q => q.type === 'error');

      if (isGenericFallback && hasErrorActiveOrQueued) {
        return;
      }
    }

    this.queue.push({ ...notification, message: trimmedMsg });
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isShowing || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.isShowing = true;
    this.currentMessage = item.message;

    const defaultDuration = item.type === 'warning' ? 9000 : item.type === 'error' ? 7000 : 4000;
    const duration = item.duration ?? defaultDuration;

    const config: MatSnackBarConfig = {
      ...NOTIFICATION_OPTS,
      duration,
      data: { message: item.message, type: item.type }
    };

    const snackBarRef = this.snackBar.openFromComponent(CustomNotificationComponent, config);

    snackBarRef.afterDismissed().subscribe(() => {
      this.isShowing = false;
      this.currentMessage = null;
      this.processQueue();
    });
  }
}