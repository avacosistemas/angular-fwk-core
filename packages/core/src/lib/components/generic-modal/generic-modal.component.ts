import { Component, Inject, ViewChild, ViewContainerRef, AfterViewInit, Type, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface CustomModalComponentWithValue {
    getValue(): any;
    isValid?(): boolean;
}

export interface GenericDialogData {
    title?: string;
    message: SafeHtml | string;
    icon?: string;
    type?: 'primary' | 'accent' | 'warn' | 'info' | 'success';
    showCloseButton?: boolean;
    showConfirmButton?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
    customComponent?: Type<any>;
    componentData?: any;
}

@Component({
    selector: 'fwk-generic-modal',
    templateUrl: './generic-modal.component.html',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ],
    encapsulation: ViewEncapsulation.None
})
export class GenericModalComponent implements AfterViewInit {
    @ViewChild('customComponentContainer', { read: ViewContainerRef }) customComponentContainer!: ViewContainerRef;

    private customComponentInstance: CustomModalComponentWithValue | null = null;
    
    constructor(
        public dialogRef: MatDialogRef<GenericModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: GenericDialogData,
        private sanitizer: DomSanitizer
    ) {
        if (typeof data.message === 'string') {
            this.data.message = this.sanitizer.bypassSecurityTrustHtml(data.message);
        }
    }

    ngAfterViewInit() {
        if (this.data.customComponent && this.customComponentContainer) {
            this.customComponentContainer.clear();
            const componentRef = this.customComponentContainer.createComponent(this.data.customComponent);
            this.customComponentInstance = componentRef.instance as CustomModalComponentWithValue;

            if (this.data.componentData) {
                Object.assign(this.customComponentInstance, this.data.componentData);
            }
        }
    }

    get isCustomComponentValid(): boolean {
        if (this.customComponentInstance && this.customComponentInstance.isValid) {
            return this.customComponentInstance.isValid();
        }
        return true;
    }

    onConfirm(): void {
        if (this.customComponentInstance && typeof this.customComponentInstance.getValue === 'function') {
            const result = this.customComponentInstance.getValue();
            if (result === null) return;
            this.dialogRef.close(result);
        } else {
            this.dialogRef.close(true);
        }
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    getIconName(): string {
        if (this.data.icon) return `heroicons_outline:${this.data.icon}`;
        
        switch (this.data.type) {
            case 'success': return 'heroicons_outline:check-circle';
            case 'warn': return 'heroicons_outline:exclamation-triangle';
            case 'info': return 'heroicons_outline:information-circle';
            default: return 'heroicons_outline:check-circle';
        }
    }

    getConfirmColor(): 'primary' | 'accent' | 'warn' {
        switch (this.data.type) {
            case 'warn': return 'warn';
            case 'success': return 'accent';
            default: return 'primary';
        }
    }

    getHeaderClass(): string {
        return '';
    }

    getIconBackgroundClass(): string {
        switch (this.data.type) {
            case 'success': return 'bg-green-100 dark:bg-green-900/30';
            case 'warn': return 'bg-red-100 dark:bg-red-900/30';
            case 'info': return 'bg-blue-100 dark:bg-blue-900/30';
            default: return 'bg-accent-50 dark:bg-accent-900/30';
        }
    }

    getIconColorClass(): string {
        switch (this.data.type) {
            case 'success': return 'text-green-600 dark:text-green-400';
            case 'warn': return 'text-red-600 dark:text-red-400';
            case 'info': return 'text-blue-600 dark:text-blue-400';
            default: return 'text-accent-600 dark:text-accent-400';
        }
    }
}