import { Inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { LocalStorageService } from '../local-storage/local-storage.service';
import { ActionDef, ACTION_TYPES } from '../../model/component-def/action-def';
import { HTTP_METHODS } from '../../model/ws-def';
import { GenericHttpService } from '../generic-http-service/generic-http.service';
import { DialogService } from '../dialog-service/dialog.service';
import { AbstractAuthService } from '../../auth/abstract-auth.service';
import { FwkLoadingService } from '../../layout/infrastructure/services/loading';
import { FWK_CONFIG, FwkConfig } from '../../model/fwk-config';
import { I18nService } from '../i18n-service/i18n.service';

interface FileEntity {
  file: string;
  fileName: string;
  fileUsername?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  constructor(
    @Inject(FWK_CONFIG) private _fwkConfig: FwkConfig,
    private FwkLoadingService: FwkLoadingService,
    private i18nService: I18nService,
    private localStorageService: LocalStorageService,
    private dialogService: DialogService,
    private genericHttpService: GenericHttpService,
    private authService: AbstractAuthService,
  ) {}

  downloadFileByAction(action: ActionDef, entity: Record<string, any>): Observable<void> {
    if (action.actionType !== ACTION_TYPES.file_download) {
      return of(undefined);
    }
    if (!action.ws) {
        console.error("Acción de descarga no tiene una definición de Web Service (ws).", action);
        return of(undefined);
    }

    const ws = this.localStorageService.clone(action.ws);

    let url = ws.url || '';
    if (url && entity) {
      Object.keys(entity).forEach(key => {
        const value = entity[key] !== undefined && entity[key] !== null ? entity[key] : '';
        const regex = new RegExp(`\\{\\{${key}\\}\\}|\\{${key}\\}`, 'g');
        url = url.replace(regex, String(value));
      });
    }

    const queryParams: string[] = [];
    if (ws.querystring && entity) {
      Object.keys(ws.querystring).forEach(key => {
        const entityKey = ws.querystring![key];
        if (entity[entityKey] !== undefined && entity[entityKey] !== null) {
          queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(entity[entityKey])}`);
        }
      });
    }

    if (queryParams.length > 0) {
      url += (url.includes('?') ? '&' : '?') + queryParams.join('&');
    }

    let filename = '';
    if (action.fileName) {
      filename = action.fileName;
      if (entity) {
        Object.keys(entity).forEach(key => {
          const value = entity[key] !== undefined && entity[key] !== null ? entity[key] : '';
          const regex = new RegExp(`\\{\\{${key}\\}\\}|\\{${key}\\}`, 'g');
          filename = filename.replace(regex, String(value));
        });
      }
    }

    return new Observable<void>(observer => {
      this.FwkLoadingService.show();

      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);

      const token = this.authService.getToken();
      if (token && (!url.startsWith('http') || url.startsWith(this._fwkConfig.apiBaseUrl!))) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        this.FwkLoadingService.hide();
        if (xhr.status === 200) {
          const raw = xhr.responseText;
          let base64 = '';
          let name = filename || this.i18nService.translate('file_download_default_name');

          try {
            const json = JSON.parse(raw);
            const extracted = json[ws.key] !== undefined && json[ws.key] !== null ? json[ws.key] : json['data'];
            if (extracted && typeof extracted === 'object') {
              base64 = extracted.file || '';
              if (extracted.fileName) {
                name = extracted.fileName;
              }
            } else if (typeof extracted === 'string') {
              base64 = extracted;
            } else {
              base64 = raw;
            }
          } catch (_) {
            base64 = raw;
          }

          if (!base64) {
            observer.error(new Error(this.i18nService.translate('file_download_no_content')));
            return;
          }

          const decodedData = atob(base64);
          const byteNumbers = new Array(decodedData.length);
          for (let i = 0; i < decodedData.length; i++) {
            byteNumbers[i] = decodedData.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const ext = name.split('.').pop()?.toLowerCase() || '';
          const mimeTypes: { [key: string]: string } = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', pdf: 'application/pdf',
          };
          const mime = mimeTypes[ext] || 'application/octet-stream';
          const blob = new Blob([byteArray], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          observer.next();
          observer.complete();
        } else {
          observer.error(new Error(`HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        this.FwkLoadingService.hide();
        observer.error(new Error(this.i18nService.translate('file_download_network_error')));
      };

      xhr.send();

      return () => {
        this.FwkLoadingService.hide();
        xhr.abort();
      };
    });
  }

  previewFileByAction(action: ActionDef, entity: Record<string, any>): Observable<void> {
    if (action.actionType !== ACTION_TYPES.file_preview) {
      return of(undefined);
    }
    if (!action.ws) {
        console.error("Acción de previsualización no tiene una definición de Web Service (ws).", action);
        return of(undefined);
    }
    const ws = this.localStorageService.clone(action.ws);
    ws.method = HTTP_METHODS.get;

    return this.genericHttpService.callWs(ws, entity).pipe(
      map((response: any) => {
        if (Array.isArray(response) && response.length > 0) {
          return response[0];
        }
        return response;
      }),
      tap((fileEntity: FileEntity) => {
        const mimeType = this.getMimeType(fileEntity.fileName);
        const fileUrl = `data:${mimeType};base64,${fileEntity.file}`;
        this.dialogService.openFilePreviewModal({
          url: fileUrl,
          fileName: fileEntity.fileName,
          fileUsername: fileEntity.fileUsername ?? ''
        });
      }),
      map(() => undefined),
      catchError(error => throwError(() => error))
    );
  }

  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  downloadFileOctectStream(fileEntity: FileEntity): void {
    const decodedData = atob(fileEntity.file);
    const byteNumbers = new Array(decodedData.length);
    for (let i = 0; i < decodedData.length; i++) {
      byteNumbers[i] = decodedData.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: this.getMimeType(fileEntity.fileName) });
    this._downloadBlob(blob, fileEntity.fileName);
  }

  createAndDownloadBlobFile(body: any, options: BlobPropertyBag | undefined, filename: string): void {
    const blob = new Blob([body], options);
    this._downloadBlob(blob, filename);
  }

  public downloadCsv(data: any[], exportFileName: string): void {
    if (!data || data.length === 0) return;
    const csvData = this.convertToCSV(data);
    const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' });
    this._downloadBlob(blob, this.createFileName(exportFileName));
  }

  private _downloadBlob(blob: Blob, filename: string): void {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  private convertToCSV(objArray: any[]): string {
    const headers = Object.keys(objArray[0]);
    const headerRow = headers.join(',');
    const rows = objArray.map(row =>
      headers.map(header => JSON.stringify(row[header])).join(',')
    );
    return `${headerRow}\r\n${rows.join('\r\n')}`;
  }

  private createFileName(exportFileName: string): string {
    const date = new Date();
    const dateString = date.toLocaleDateString('es-AR');
    const timeString = date.toLocaleTimeString('es-AR', { hour12: false });
    return `${exportFileName}_${dateString}_${timeString}.csv`;
  }
}