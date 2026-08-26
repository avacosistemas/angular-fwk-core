import { Component, Input, forwardRef, ViewChild, ElementRef, ChangeDetectorRef, HostListener, TemplateRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageCropperModule, ImageCroppedEvent, ImageTransform } from 'ngx-image-cropper';
import { DynamicFieldFormComponent } from '../dynamic-field-form/dynamic-field-form.component';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { formatImageSrc } from '../../../utils/image-utils';
import { GenericHttpService } from '../../../services/generic-http-service/generic-http.service';
import { DialogService } from '../../../services/dialog-service/dialog.service';
import { I18nService } from '../../../services/i18n-service/i18n.service';
import { NotificationService } from '../../../services/notification/notification.service';

@Component({
    selector: 'fwk-image-cropper',
    templateUrl: './image-cropper.component.html',
    styleUrls: ['./image-cropper.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatDialogModule,
        MatProgressSpinnerModule,
        ImageCropperModule,
        TranslatePipe
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ImageCropperComponent),
            multi: true
        }
    ]
})
export class ImageCropperComponent extends DynamicFieldFormComponent<string> {
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
    @ViewChild('cropModal') cropModal!: TemplateRef<any>;

    hasInitialImage = false;
    imageChangedEvent: any = '';
    croppedImage: string | null | undefined = '';
    tempCroppedImage: string | null | undefined = '';
    transform: ImageTransform = {};
    rotation = 0;
    isImageLoading = false;
    
    private dialogRef: MatDialogRef<any> | null = null;
    
    private genericHttpService = inject(GenericHttpService);
    private dialogService = inject(DialogService);
    private i18nService = inject(I18nService);
    private notificationService = inject(NotificationService);

    constructor(private cdr: ChangeDetectorRef, private dialog: MatDialog) {
        super();
    }

    override writeValue(value: any): void {
        super.writeValue(value);
        this.croppedImage = formatImageSrc(value) || '';
        if (this.croppedImage) {
            this.hasInitialImage = true;
        }
        this.cdr.markForCheck();
    }

    cancelNewSelection(): void {
        this.clearImageState();
    }

    fileChangeEvent(event: any): void {
        if (event.target.files && event.target.files.length > 0) {
            this.imageChangedEvent = event;
            this.rotation = 0;
            this.transform = {};
            this.tempCroppedImage = '';
            this.isImageLoading = true;
            this.openDialog();
            this.cdr.markForCheck();
        }
    }

    openDialog() {
        this.isImageLoading = true;
        this.dialogRef = this.dialog.open(this.cropModal, {
            width: '450px',
            disableClose: true,
            panelClass: 'control-mat-dialog'
        });
    }

    editCrop() {
        if (this.imageChangedEvent) {
            this.openDialog();
        }
    }

    imageCropped(event: ImageCroppedEvent) {
        this.tempCroppedImage = event.base64 || event.objectUrl || '';
        this.cdr.markForCheck();
    }

    imageLoaded() {
        this.isImageLoading = false;
        this.cdr.markForCheck();
    }

    cropperReady() {
        this.isImageLoading = false;
        this.cdr.markForCheck();
    }

    loadImageFailed() {
        console.error('Load image failed');
        this.isImageLoading = false;
        this.cdr.markForCheck();
    }

    rotateImage() {
        this.rotation = (this.rotation + 90) % 360;
        this.transform = {
            ...this.transform,
            rotate: this.rotation
        };
        this.cdr.markForCheck();
    }

    confirmCrop() {
        if (this.dialogRef) {
            this.dialogRef.close();
        }
        
        if (this.tempCroppedImage) {
            this.croppedImage = this.tempCroppedImage;
            
            let valueToEmit = this.croppedImage;
            if (this.croppedImage && this.croppedImage.startsWith('data:image')) {
                valueToEmit = this.croppedImage.split(',')[1];
            }
            
            this.onChange(valueToEmit as string);
            this.onTouch();
        }
        
        this.cdr.markForCheck();
    }

    cancelCrop() {
        if (this.dialogRef) {
            this.dialogRef.close();
        }
        if (!this.croppedImage) {
            this.imageChangedEvent = '';
            if (this.fileInput && this.fileInput.nativeElement) {
                this.fileInput.nativeElement.value = '';
            }
        }
        this.cdr.markForCheck();
    }

    openFileInput() {
        if (!this.isDisabled && this.fileInput) {
            this.fileInput.nativeElement.click();
        }
    }
    
    removeImage(): void {
        const removeUrl = this.field?.options?.removeUrl || this.field?.options?.removeWs?.url || this.field?.options?.removeEndpoint;

        if (removeUrl) {
            const confirmTitle = this.i18nService.translate('image_cropper_remove_confirm_title') || 'Borrar Foto de Perfil';
            const confirmMessage = this.i18nService.translate('image_cropper_remove_confirm_message') || 'Estás a punto de borrar tu foto de perfil. ¿Confirmás la operación?';
            const confirmLabel = this.i18nService.translate('btn_confirm') || this.i18nService.translate('modal_button_confirm') || 'Confirmar';
            const cancelLabel = this.i18nService.translate('btn_close') || this.i18nService.translate('modal_button_close') || 'Cerrar';

            this.dialogService.showQuestionModal({
                title: confirmTitle,
                message: confirmMessage,
                icon: {
                    show: true,
                    name: 'heroicons_outline:exclamation-triangle',
                    color: 'warn'
                },
                actions: {
                    confirm: { show: true, label: confirmLabel, color: 'primary' },
                    cancel: { show: true, label: cancelLabel }
                },
                onSubmit: () => {
                    this.genericHttpService.basicGet(removeUrl, null, null, {}).subscribe({
                        next: (res: any) => {
                            if (res && res.ok === false) {
                                const errorMsg = res.message || this.i18nService.translate('action_error_default_message');
                                this.notificationService.notifyError(errorMsg);
                                return;
                            }

                            const successTitle = this.i18nService.translate('image_cropper_remove_success_title') || 'Borrar Foto de Perfil';
                            const successMessage = this.i18nService.translate('image_cropper_remove_success_message') || 'Se ha borrado con éxito tu foto de perfil';

                            this.dialogService.showQuestionModal({
                                title: successTitle,
                                message: successMessage,
                                icon: {
                                    show: true,
                                    name: 'heroicons_outline:check-circle',
                                    color: 'success'
                                },
                                actions: {
                                    confirm: { show: false },
                                    cancel: { show: true, label: cancelLabel }
                                },
                                onSubmit: () => this.clearImageState(),
                                onReject: () => this.clearImageState()
                            });
                        },
                        error: (err: any) => {
                            console.error('[ImageCropper] Error removing photo:', err);
                            const msg = err?.error?.message || this.i18nService.translate('action_execution_error_message');
                            this.notificationService.notifyError(msg);
                        }
                    });
                }
            });
        } else {
            this.clearImageState();
        }
    }

    private clearImageState(): void {
        this.croppedImage = '';
        this.imageChangedEvent = '';
        this.hasInitialImage = false;
        this.onChange('');
        this.onTouch();
        if (this.fileInput && this.fileInput.nativeElement) {
            this.fileInput.nativeElement.value = '';
        }
        this.cdr.markForCheck();
    }
}
