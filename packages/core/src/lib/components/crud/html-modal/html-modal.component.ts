import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SanitizeHtmlPipe } from '../../../pipe/sanitize-html.pipe';
import { TranslatePipe } from '../../../pipe/translate.pipe';

export interface HtmlModalData {
    html: string;
    title?: string;
    modalName?: string;
}

@Component({
     selector: 'fwk-html-modal-component',
    templateUrl: './html-modal.component.html',
    styleUrls: ['./html-modal.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        SanitizeHtmlPipe,
        TranslatePipe
    ]
})
export class HtmlModalComponent {

    constructor(
        public dialogRef: MatDialogRef<HtmlModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: HtmlModalData
    ) {
        this.dialogRef.disableClose = false;
    }

    close(): void {
        this.dialogRef.close();
    }
}