import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
    selector: 'fwk-file-uploader',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatButtonModule,
        MatTooltipModule,
        TranslatePipe,
        MatFormFieldModule
    ],
    templateUrl: './file-uploader.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FileUploaderComponent),
            multi: true
        }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUploaderComponent implements ControlValueAccessor {
    @Input() label: string = '';
    @Input() title: string = '';
    @Input() description: string = '';
    @Input() icon: string = 'heroicons_outline:cloud-arrow-up';
    @Input() accept: string = '*/*'; 
    @Input() multiple: boolean = false;
    @Input() isLoading: boolean = false;
    @Input() loadingText: string = '';
    @Input() required: boolean = false;
    @Input() errorMessage: string | null = null;

    @Output() fileSelected = new EventEmitter<File | File[] | null>();

    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    files: File[] = [];
    isDisabled: boolean = false;
    isDragging: boolean = false;

    onChange: (value: File | File[] | null) => void = () => { };
    onTouched: () => void = () => { };

    constructor(private _cdr: ChangeDetectorRef) {}

    get hasFiles(): boolean {
        return this.files && this.files.length > 0;
    }

    writeValue(obj: any): void {
        if (obj === null || obj === undefined) {
            this.files = [];
        } else if (Array.isArray(obj)) {
            this.files = obj;
        } else if (obj instanceof File) {
            this.files = [obj];
        }
        this._cdr.markForCheck();
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this._cdr.markForCheck();
    }

    triggerFileInput(): void {
        this.fileInputRef.nativeElement.value = '';
        this.fileInputRef.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.onTouched();
        
        if (input.files && input.files.length > 0) {
            this.handleFiles(input.files);
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.isDisabled && !this.isLoading) {
            this.isDragging = true;
        }
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
        this.onTouched();

        if (this.isDisabled || this.isLoading) return;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFiles(files);
        }
    }

    removeFile(index: number, event: Event): void {
        event.stopPropagation();
        this.files.splice(index, 1);
        this.emitValue();
        this.onTouched();
    }

    private handleFiles(fileList: FileList): void {
        const validFiles: File[] = [];
        const acceptedExtensions = this.accept.split(',').map(e => e.trim().toLowerCase());

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            if (this.accept === '*/*' || this.checkExtension(file, acceptedExtensions)) {
                validFiles.push(file);
            }
        }

        if (this.multiple) {
            this.files = [...this.files, ...validFiles];
        } else {
            if (validFiles.length > 0) {
                this.files = [validFiles[0]];
            }
        }

        this.emitValue();
    }

    private checkExtension(file: File, accepted: string[]): boolean {
        const fileName = file.name.toLowerCase();
        const fileType = file.type.toLowerCase();
        
        return accepted.some(ext => {
            if (ext.endsWith('/*')) {
                const baseType = ext.substring(0, ext.length - 2);
                return fileType.startsWith(baseType);
            }
            return fileName.endsWith(ext) || fileType === ext;
        });
    }

    private emitValue(): void {
        const value = this.multiple ? this.files : (this.files.length > 0 ? this.files[0] : null);
        this.onChange(value);
        this.fileSelected.emit(value);
        this._cdr.markForCheck();
    }

    formatBytes(bytes: number, decimals = 2): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    getFileIcon(file: File): string {
        const name = file.name.toLowerCase();
        if (name.endsWith('.pdf')) return 'heroicons_outline:document-text';
        if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'heroicons_outline:table-cells';
        if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'heroicons_outline:photo';
        if (name.endsWith('.txt') || name.endsWith('.rtf')) return 'heroicons_outline:document';
        if (name.endsWith('.zip') || name.endsWith('.rar')) return 'heroicons_outline:archive-box';

        return 'heroicons_outline:document';
    }

    getFileColorClass(file: File): string {
        const name = file.name.toLowerCase();
        if (name.endsWith('.pdf')) {
            return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        }
        if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
            return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        }
        if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
            return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
        }
        if (name.endsWith('.zip') || name.endsWith('.rar')) {
            return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
        }

        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    }
}