import { Component, ChangeDetectionStrategy, inject, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

import { IconPickerComponent } from '../../../../../components/icon-picker/icon-picker.component';
import { TranslatePipe } from '../../../../../pipe/translate.pipe';
import { DevToolsService } from '../../../services/dev-tools.service';
import { DevToolsStateService } from '../../../services/dev-tools-state.service';
import { NotificationService } from '../../../../../services/notification/notification.service';

@Component({
    selector: 'fwk-navigation-editor',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
        MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
        IconPickerComponent, TranslatePipe
    ],
    templateUrl: './navigation-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationEditorComponent implements OnChanges {
    @Input() definitionId: string;
    @Input() definitionData: any;
    @Input() navigationGroups: any[];

    private _fb = inject(FormBuilder);
    private _devToolsService = inject(DevToolsService);
    private _devToolsStateService = inject(DevToolsStateService);
    private _notificationService = inject(NotificationService);
    private _cdr = inject(ChangeDetectorRef);

    navForm: FormGroup;
    isSaving = false;

    constructor() {
        this.navForm = this._fb.group({
            title: ['', Validators.required],
            pageTitle: ['', Validators.required],
            group: ['', Validators.required],
            icon: [''],
            showInMenu: [true]
        });
        this.navForm.disable();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['definitionData'] && this.definitionData?.navigation) {

            const navigationData = this.definitionData.navigation;
            const i18nWords = this.definitionData.i18n?.words || {};

            const dataToPatch: any = { ...navigationData };
            dataToPatch.pageTitle = i18nWords.page_title || '';

            if (dataToPatch.icon && typeof dataToPatch.icon === 'string') {
                const parts = dataToPatch.icon.split(':');
                dataToPatch.icon = parts[parts.length - 1];
            }

            this.navForm.patchValue(dataToPatch);
            this.navForm.enable();
            this.navForm.markAsPristine();
            this._cdr.markForCheck();
        }
    }

    saveNavigation(): void {
        if (!this.navForm.dirty) {
            this._notificationService.notify('No hay cambios para guardar.');
            return;
        }

        this.isSaving = true;
        this.navForm.disable();
        this._cdr.markForCheck();

        const payload: {
            navigationData?: any;
            i18nUpdates?: any;
        } = {};

        const navControls = ['group', 'icon', 'showInMenu'];
        const hasNavChanges = navControls.some(key => this.navForm.get(key)?.dirty);

        if (hasNavChanges) {
            const iconValue = this.navForm.get('icon').value;
            payload.navigationData = {
                group: this.navForm.get('group').value,
                showInMenu: this.navForm.get('showInMenu').value,
                icon: iconValue ? `heroicons_outline:${iconValue}` : null
            };
        }

        const i18nUpdates: Record<string, string> = {};
        if (this.navForm.get('title').dirty) {
            i18nUpdates[this.definitionData.navigation.translateKey] = this.navForm.get('title').value;
        }
        if (this.navForm.get('pageTitle').dirty) {
            i18nUpdates['page_title'] = this.navForm.get('pageTitle').value;
        }
        if (Object.keys(i18nUpdates).length > 0) {
            payload.i18nUpdates = i18nUpdates;
        }

        if (!payload.navigationData && !payload.i18nUpdates) {
            this._notificationService.notify('No hay cambios para guardar.');
            this.isSaving = false;
            this.navForm.enable();
            this._cdr.markForCheck();
            return;
        }

        this._devToolsService.updateNavigationDefinition(this.definitionId, payload).pipe(
            finalize(() => {
                this.isSaving = false;
                this.navForm.enable();
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (res) => {
                if (payload.i18nUpdates) {
                    if (payload.i18nUpdates.page_title) {
                        this.definitionData.i18n.words.page_title = payload.i18nUpdates.page_title;
                    }
                    if (payload.i18nUpdates[this.definitionData.navigation.translateKey]) {
                        this.definitionData.navigation.title = payload.i18nUpdates[this.definitionData.navigation.translateKey];
                    }
                }
                if (payload.navigationData) {
                    Object.assign(this.definitionData.navigation, payload.navigationData);
                }

                this.navForm.markAsPristine();
                this._devToolsStateService.show(res.message);
            },
            error: (err) => {
                this._notificationService.notifyError(err.error?.message || 'Error al guardar la navegación.');
            }
        });
    }
}