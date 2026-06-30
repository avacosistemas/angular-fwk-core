import { Component, Input, forwardRef, ElementRef, ViewChild, ChangeDetectorRef, Optional, Host, SkipSelf, HostListener, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, Validator, AbstractControl, ValidationErrors, NG_VALIDATORS, FormsModule, ControlContainer } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { I18nService } from '../../../services/i18n-service/i18n.service';

@Component({
    selector: 'fwk-file',
    templateUrl: './file.component.html',
    styleUrls: ['./file.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatProgressBarModule,
        TranslatePipe
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FileComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => FileComponent),
            multi: true
        }
    ],
    viewProviders: [
        {
            provide: ControlContainer,
            useFactory: (container: ControlContainer) => container,
            deps: [[new Optional(), new SkipSelf(), ControlContainer]]
        }
    ]
})
export class FileComponent implements ControlValueAccessor, Validator {

    @Input() field!: any;
    @Input() errorMessage: string | null = null;

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    files: { name: string, size: string, base64: string, byteArray: number[] }[] = [];

    isDisabled: boolean = false;
    isDragging: boolean = false;
    isLoading: boolean = false;
    hasErrorMessage: string | null = null;

    onChange: (value: any) => void = () => { };
    onTouch: () => void = () => { };

    private i18nService: I18nService;

    constructor(
        private cdr: ChangeDetectorRef,
        @Optional() @Host() @SkipSelf() private controlContainer: ControlContainer,
        injector: Injector
    ) {
        this.i18nService = injector.get(I18nService);
    }

    get acceptTypes(): string {
        return this.field?.options?.acceptTypes ?? '*/*';
    }

    get isMultiple(): boolean {
        return this.field?.options?.multiple === true;
    }

    get maxFiles(): number | null {
        return this.field?.options?.maxFiles || null;
    }

    get maxSizeMB(): number | null {
        return this.field?.options?.maxSize || null;
    }

    get canUploadMore(): boolean {
        if (!this.isMultiple) return this.files.length === 0;
        if (this.maxFiles) return this.files.length < this.maxFiles;
        return true;
    }

    get uploadLimitText(): string {
        if (!this.isMultiple) return this.i18nService.translate('file_uploader_single_file');
        if (this.maxFiles) return this.i18nService.translate('file_uploader_max_files').replace('{max}', String(this.maxFiles));
        return this.i18nService.translate('file_uploader_no_limit');
    }

    get isImageUploaderOnly(): boolean {
        const accept = this.acceptTypes.toLowerCase();
        if (!accept || accept === '*/*') return false;
        if (accept.includes('.xls') || accept.includes('.pdf') || accept.includes('.doc') || accept.includes('.csv')) return false;
        if (accept.includes('image/') || accept.includes('.jpg') || accept.includes('.png')) return true;
        return false;
    }

    get uploadTitle(): string {
        return this.isImageUploaderOnly ? this.i18nService.translate('file_uploader_photos_title') : this.i18nService.translate('file_uploader_files_title');
    }

    get mainIcon(): string {
        return this.isImageUploaderOnly ? 'heroicons_outline:photo' : 'heroicons_outline:cloud-arrow-up';
    }

    @HostListener('dragover', ['$event']) onDragOver(evt: any) {
        evt.preventDefault();
        evt.stopPropagation();
        if (!this.isDisabled && this.canUploadMore) this.isDragging = true;
    }

    @HostListener('dragleave', ['$event']) onDragLeave(evt: any) {
        evt.preventDefault();
        evt.stopPropagation();
        this.isDragging = false;
    }

    @HostListener('drop', ['$event']) onDrop(evt: any) {
        evt.preventDefault();
        evt.stopPropagation();
        this.isDragging = false;
        if (this.isDisabled || !this.canUploadMore) return;

        const files = evt.dataTransfer.files;
        if (files.length > 0) {
            this.handleInputFiles(files);
        }
    }

    writeValue(value: any): void {
        this.files = [];
        if (value) {
            if (Array.isArray(value)) {
                if (value.length > 0 && Array.isArray(value[0])) {
                    this.files = value.map((v, i) => ({
                        name: this.i18nService.translate('file_uploader_array_file_name').replace('{index}', String(i + 1)),
                        size: '',
                        base64: this.byteArrayToBase64(v),
                        byteArray: v
                    }));
                } else if (value.length > 0 && typeof value[0] === 'number') {
                    this.files = [{
                        name: this.i18nService.translate('file_uploader_current_file'),
                        size: '',
                        base64: this.byteArrayToBase64(value),
                        byteArray: value
                    }];
                }
            } else if (typeof value === 'string') {
                this.files = [{
                    name: this.i18nService.translate('file_uploader_current_file'),
                    size: '',
                    base64: value,
                    byteArray: []
                }];
            }
        }
        this.cdr.markForCheck();
    }

    registerOnChange(fn: any): void { this.onChange = fn; }
    registerOnTouched(fn: any): void { this.onTouch = fn; }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this.cdr.markForCheck();
    }

    validate(control: AbstractControl): ValidationErrors | null {
        if (this.field?.required && (!this.files || this.files.length === 0)) {
            return { required: true };
        }
        return null;
    }

    onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.handleInputFiles(input.files);
        }
    }

    private async handleInputFiles(fileList: FileList | File[]): Promise<void> {
        let remainingSlots = fileList.length;
        
        if (this.isMultiple && this.maxFiles) {
            remainingSlots = this.maxFiles - this.files.length;
            if (remainingSlots <= 0) {
                this.handleError(this.i18nService.translate('file_uploader_max_files_reached').replace('{max}', String(this.maxFiles)));
                return;
            }
        } else if (!this.isMultiple) {
            remainingSlots = 1;
            this.files = [];
        }

        const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
        this.isLoading = true;
        this.hasErrorMessage = null;

        for (const file of filesToProcess) {
            await this.processFile(file);
        }

        this.isLoading = false;
        this.updateValue();
        this.cdr.markForCheck();
    }

    private processFile(file: File): Promise<void> {
        return new Promise((resolve) => {
            
            if (this.acceptTypes !== '*/*' && !this.checkFileType(file)) {
                this.handleError(this.i18nService.translate('file_uploader_format_not_allowed').replace('{fileName}', file.name));
                resolve();
                return;
            }

            if (this.maxSizeMB) {
                const fileSizeMB = file.size / (1024 * 1024);
                if (fileSizeMB > this.maxSizeMB) {
                    this.handleError(this.i18nService.translate('file_uploader_size_exceeded').replace('{fileName}', file.name).replace('{maxSizeMB}', String(this.maxSizeMB)));
                    resolve();
                    return;
                }
            }

            const reader = new FileReader();
            reader.onload = () => {
                const base64Result = reader.result as string;
                const rawBase64 = base64Result.split(',')[1];
                const byteArray = this.base64ToByteArray(rawBase64);

                this.files.push({
                    name: file.name,
                    size: this.formatBytes(file.size),
                    base64: rawBase64,
                    byteArray: byteArray
                });
                resolve();
            };
            reader.onerror = () => {
                this.handleError(this.i18nService.translate('file_uploader_read_error').replace('{fileName}', file.name));
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    private updateValue(): void {
        const outputFormat = this.field?.options?.outputFormat ?? 'byteArray';
        let value = null;

        if (this.isMultiple) {
            value = this.files.map(f => {
                if (outputFormat === 'object') return { archivo: f.base64, nombre: f.name };
                return f.byteArray;
            });
        } else {
            const f = this.files[0];
            if (f) {
                value = outputFormat === 'object' ? { archivo: f.base64, nombre: f.name } : f.byteArray;
            }
        }

        this.onChange(value);
        this.onTouch();
        this.cdr.markForCheck();
    }

    removeFile(index: number, event: Event): void {
        event.stopPropagation();
        this.files.splice(index, 1);
        this.hasErrorMessage = null;
        this.updateValue();
        
        if(this.files.length === 0) {
            this.fileInput.nativeElement.value = '';
        }
    }

    triggerFileInput(): void {
        if (!this.isDisabled && this.canUploadMore) {
            this.fileInput.nativeElement.value = '';
            this.fileInput.nativeElement.click();
        }
    }

    private checkFileType(file: File): boolean {
        const accepted = this.acceptTypes.split(',').map(t => t.trim().toLowerCase());
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const type = file.type.toLowerCase();
        return accepted.some(acc => acc === ext || type.match(new RegExp(acc.replace('*', '.*'))));
    }

    private handleError(msg: string): void {
        this.hasErrorMessage = msg;
        this.cdr.markForCheck();
    }

    private byteArrayToBase64(byteArray: number[]): string {
        if (!byteArray || byteArray.length === 0) return '';
        try {
            const bytes = new Uint8Array(byteArray);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        } catch (e) {
            return '';
        }
    }

    private base64ToByteArray(base64: string): number[] {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    }

    private formatBytes(bytes: number, decimals = 2): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    isImage(file: any): boolean {
        if (file.name && file.name !== 'Archivo actual') {
            return /\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i.test(file.name);
        }
        if (file.base64) {
            const prefix = file.base64.substring(0, 10);
            if (prefix.startsWith('/9j/') || prefix.startsWith('iVBOR') || prefix.startsWith('R0lG') || prefix.startsWith('UklG')) return true;
        }
        return this.isImageUploaderOnly;
    }

    getFileIcon(fileName: string): string {
        if (!fileName) return 'heroicons_outline:document';
        const name = fileName.toLowerCase();
        if (name.endsWith('.pdf')) return 'heroicons_outline:document-text';
        if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'heroicons_outline:table-cells';
        if (name.endsWith('.zip') || name.endsWith('.rar')) return 'heroicons_outline:archive-box';
        if (name.endsWith('.doc') || name.endsWith('.docx')) return 'heroicons_outline:document-text';
        return 'heroicons_outline:document';
    }

    getFileColorClass(fileName: string): string {
        if (!fileName) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
        const name = fileName.toLowerCase();
        if (name.endsWith('.pdf')) return 'bg-red-50 text-red-600 dark:bg-red-900/30 border-red-200';
        if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'bg-green-50 text-green-600 dark:bg-green-900/30 border-green-200';
        if (name.endsWith('.doc') || name.endsWith('.docx')) return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 border-blue-200';
        if (name.endsWith('.zip') || name.endsWith('.rar')) return 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 border-orange-200';
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
    }
}