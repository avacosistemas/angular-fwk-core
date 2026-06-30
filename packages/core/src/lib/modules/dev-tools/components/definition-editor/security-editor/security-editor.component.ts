import { Component, ChangeDetectionStrategy, inject, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { TranslatePipe } from '../../../../../pipe/translate.pipe';
import { DevToolsService } from '../../../services/dev-tools.service';
import { DevToolsStateService } from '../../../services/dev-tools-state.service';
import { NotificationService } from '../../../../../services/notification/notification.service';

@Component({
    selector: 'fwk-security-editor',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe
    ],
    templateUrl: './security-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityEditorComponent implements OnChanges {
    @Input() definitionId: string;
    @Input() isDashboardDef: boolean = false;
    @Input() navigationGroups: any[];

    private _securityData: any;
    @Input()
    set securityData(value: any) {
        this._securityData = value || {};
    }
    get securityData(): any {
        return this._securityData;
    }

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _devToolsStateService = inject(DevToolsStateService);
    private _notificationService = inject(NotificationService);
    private _cdr = inject(ChangeDetectorRef);

    securityForm: FormGroup;
    isSaving = false;

    constructor() {
        this.securityForm = this._fb.group({
            readAccess: [''],
            updateAccess: [''],
            createAccess: [''],
            deleteAccess: ['']
        });
        this.securityForm.disable();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['securityData'] && this.securityData) {
            this.securityForm.patchValue(this.securityData);
            this.securityForm.enable();
            
            if (this.isDashboardDef) {
                this.securityForm.get('updateAccess')?.disable();
                this.securityForm.get('createAccess')?.disable();
                this.securityForm.get('deleteAccess')?.disable();
            }

            this.securityForm.markAsPristine();
            this._cdr.markForCheck();
        }
    }

    saveSecurity(): void {
        if (!this.securityForm.dirty) {
            this._notificationService.notify('No hay cambios para guardar.');
            return;
        }

        this.isSaving = true;
        this.securityForm.disable();
        this._cdr.markForCheck();

        const payload = this.securityForm.getRawValue();

        this._devToolsService.updateSecurityDefinition(this.definitionId, payload).pipe(
            finalize(() => {
                this.isSaving = false;
                this.securityForm.enable();
                if (this.isDashboardDef) { 
                    this.securityForm.get('updateAccess')?.disable();
                    this.securityForm.get('createAccess')?.disable();
                    this.securityForm.get('deleteAccess')?.disable();
                }
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (res) => {
                this.securityData = { ...this.securityData, ...this.securityForm.value };
                this.securityForm.markAsPristine();
                this._devToolsStateService.show(res.message);
            },
            error: (err) => {
                this._notificationService.notifyError(err.error?.message || 'Error al guardar la seguridad.');
            }
        });
    }
}