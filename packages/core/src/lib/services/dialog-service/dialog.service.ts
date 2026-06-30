import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { FormService } from '../dynamic-form/form.service';

import { FormDef } from '../../model/form-def';
import { I18n } from '../../model/i18n';
import { BasicModalComponent } from '../../components/crud/basic-modal/basic-modal.component';
import { HtmlModalComponent } from '../../components/crud/html-modal/html-modal.component';
import { QuestionModalComponent, QuestionModalData } from '../../components/question-modal/question-modal.component';
import { ModalPreviewComponent } from '../../components/modal-preview/modal-preview.component';
import { GridModalComponent, GridModalData } from '../../components/grid-modal/grid-modal.component';
import { GenericModalComponent, GenericDialogData } from '../../components/generic-modal/generic-modal.component';

interface FilePreviewData {
    url: string;
    fileName: string;
    fileUsername: string;
}

@Injectable({
    providedIn: 'root'
})
export class DialogService {

    constructor(
        private dialog: MatDialog,
        private formService: FormService
    ) {
        this.formService.showModalRequest.subscribe(data => this.showQuestionModal(data));
    }


    openHtmlModal<T = any>(data: any, dialogConfig?: MatDialogConfig): MatDialogRef<HtmlModalComponent, T> {
        const config: MatDialogConfig = {
            width: '80vw',
            maxWidth: '900px',
            panelClass: 'control-mat-dialog',
            ...dialogConfig,
            data: data
        };
        return this.dialog.open<HtmlModalComponent, any, T>(HtmlModalComponent, config);
    }

    showFormDialog<T = any>({ i18n, formDef, dialogConfig, entity = null, onSubmit, modalName = null }: {
        i18n: I18n;
        formDef: FormDef;
        dialogConfig?: MatDialogConfig;
        entity?: any;
        onSubmit?: (result: any) => void;
        modalName?: string | null;
    }): MatDialogRef<BasicModalComponent, T> {

        const data = {
            entity: entity,
            config: {
                formKey: formDef.key,
                form: formDef.fields,
                ws: formDef.submitWs
            },
            i18n: i18n,
            modalName: modalName,
            submit: onSubmit
        };

        const config: MatDialogConfig = {
            width: '500px',
            panelClass: 'control-mat-dialog',
            ...dialogConfig,
            data: data
        };

        return this.dialog.open<BasicModalComponent, any, T>(BasicModalComponent, config);
    }

    showQuestionModal(data: QuestionModalData): MatDialogRef<QuestionModalComponent> {
        return this.dialog.open(QuestionModalComponent, {
            width: '450px',
            maxWidth: '90vw',
            data: data,
            panelClass: 'alert-modal-panel',
            backdropClass: 'alert-modal-backdrop'
        });
    }

    showGridModal<T = any>(data: GridModalData): MatDialogRef<GridModalComponent, T> {
        const config: MatDialogConfig = {
            width: '80vw',
            maxWidth: '1024px',
            data: data
        };
        return this.dialog.open<GridModalComponent, any, T>(GridModalComponent, config);
    }

    openFilePreviewModal(fileData: FilePreviewData): MatDialogRef<ModalPreviewComponent> {
        return this.dialog.open(ModalPreviewComponent, {
            width: 'auto',
            maxWidth: '95vw',
            maxHeight: '95vh',
            panelClass: 'control-mat-dialog',
            data: fileData
        });
    }

    showGenericModal<T = any>(data: GenericDialogData): MatDialogRef<GenericModalComponent, T> {
        return this.dialog.open<GenericModalComponent, any, T>(GenericModalComponent, {
            width: '500px',
            maxWidth: '90vw',
            panelClass: 'generic-modal-panel',
            data: data
        });
    }
}