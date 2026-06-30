import { Component, Inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '../../pipe/translate.pipe';

export interface FilePreviewData {
    url: string;
    fileName: string;
    fileUsername?: string;
}

@Component({
     selector: 'fwk-modal-preview',
    templateUrl: './modal-preview.component.html',
    styleUrls: ['./modal-preview.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressBarModule,
        TranslatePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class ModalPreviewComponent implements OnInit {
    sanitizedUrl!: SafeUrl | SafeResourceUrl;
    sanitizedDownloadUrl!: SafeUrl;
    
    isImageUrl: boolean = false;
    isLoading: boolean = true;
    hasError: boolean = false;

    imageMeta: { width: number; height: number } | null = null;
    fileSize: string = '';
    fileIcon: string = 'heroicons_outline:document';

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: FilePreviewData,
        private sanitizer: DomSanitizer,
        private dialogRef: MatDialogRef<ModalPreviewComponent>,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        if (!this.data?.url) {
            this.hasError = true;
            this.isLoading = false;
            return;
        }

        this.determineFileIcon();
        this.calculateFileSize();

        this.isImageUrl = this.checkIfImage(this.data.fileName);
        this.sanitizedDownloadUrl = this.sanitizer.bypassSecurityTrustUrl(this.data.url);

        if (this.isImageUrl) {
            this.sanitizedUrl = this.sanitizer.bypassSecurityTrustUrl(this.data.url);
            this.preloadImage(this.data.url);
        } else {
            this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.url);
            setTimeout(() => {
                this.isLoading = false;
                this.cdr.markForCheck();
            }, 1000);
        }
    }

    private checkIfImage(fileName: string): boolean {
        if (!fileName) return false;
        return /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i.test(fileName);
    }

    private determineFileIcon(): void {
        const ext = this.data.fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': this.fileIcon = 'heroicons_outline:document-text'; break;
            case 'jpg': case 'jpeg': case 'png': case 'gif': this.fileIcon = 'heroicons_outline:photo'; break;
            case 'zip': case 'rar': this.fileIcon = 'heroicons_outline:archive-box'; break;
            default: this.fileIcon = 'heroicons_outline:document'; break;
        }
    }

    private async calculateFileSize(): Promise<void> {
        try {
            if (this.data.url.startsWith('blob:')) {
                const response = await fetch(this.data.url);
                const blob = await response.blob();
                this.fileSize = this.formatBytes(blob.size);
            } 
            else if (this.data.url.includes('base64,')) {
                const base64Length = this.data.url.split(',')[1].length;
                const sizeInBytes = Math.ceil(base64Length * 3 / 4);
                this.fileSize = this.formatBytes(sizeInBytes);
            }
            this.cdr.markForCheck();
        } catch (e) {
            console.warn('No se pudo calcular el tamaño del archivo');
        }
    }

    private formatBytes(bytes: number, decimals = 2): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    }

    private preloadImage(url: string): void {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            this.imageMeta = { width: img.width, height: img.height };
            this.isLoading = false;
            this.cdr.markForCheck();
        };
        img.onerror = () => {
            this.hasError = true;
            this.isLoading = false;
            this.cdr.markForCheck();
        };
    }

    onIframeLoad(): void {
        this.isLoading = false;
        this.cdr.markForCheck();
    }

    closeModal(): void {
        this.dialogRef.close();
    }
}