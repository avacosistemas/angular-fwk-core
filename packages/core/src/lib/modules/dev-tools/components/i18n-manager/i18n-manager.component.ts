import { Component, ChangeDetectionStrategy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { finalize, Subject, debounceTime, startWith } from 'rxjs';
import { DevToolsService } from '../../services/dev-tools.service';
import { NotificationService } from '../../../../services/notification/notification.service';
import { DevToolsStateService } from '../../services/dev-tools-state.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

@Component({
    selector: 'fwk-i18n-manager',
    standalone: true,
    imports: [ CommonModule, ReactiveFormsModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTableModule, TitleCasePipe, MatProgressBarModule, TranslatePipe ],
    templateUrl: './i18n-manager.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class I18nManagerComponent implements OnInit {
    private _devToolsService = inject(DevToolsService);
    private _notificationService = inject(NotificationService);
    private _cdr = inject(ChangeDetectorRef);
    private _fb = inject(FormBuilder);
    private _devToolsStateService = inject(DevToolsStateService);

    isLoading = true;
    isSaving = false;

    mainForm: FormGroup;
    searchControl = new FormControl('');
    
    initialData: any;
    dataSources: MatTableDataSource<AbstractControl>[] = [];
    
    panelOpenState: boolean[] = [];
    
    metaPanelState = {
        hidden: false,
        expanded: false 
    };

    get metaGroup(): FormGroup {
        return this.mainForm.get('meta') as FormGroup;
    }

    get categoriesArray(): FormArray {
        return this.mainForm.get('categories') as FormArray;
    }

    ngOnInit(): void {
        this.mainForm = this._fb.group({
            meta: this._fb.group({
                title: [''],
                description: ['']
            }),
            categories: this._fb.array([])
        });

        this._devToolsService.getMainI18nData().pipe(
            finalize(() => {
                this.isLoading = false;
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: data => {
                this.initialData = JSON.parse(JSON.stringify(data)); 
                this.metaGroup.patchValue(data.meta);

                data.categories.forEach(category => {
                    const keysFormArray = this._fb.array(
                        category.keys.map(k => this._fb.group({ key: [k.key], value: [k.value] }))
                    );
                    this.categoriesArray.push(this._fb.group({
                        name: [category.name],
                        keys: keysFormArray
                    }));
                });
                
                this.panelOpenState = new Array(this.categoriesArray.length).fill(false);

                this.setupDataSources();
                
                this.searchControl.valueChanges.pipe(
                    startWith(''),
                    debounceTime(200)
                ).subscribe(value => {
                    this.applyFilter(value);
                });

                this.mainForm.markAsPristine();
                this._cdr.markForCheck();
            },
            error: err => {
                this._notificationService.notifyError(err.error?.message || 'No se pudieron cargar los textos de I18N.');
            }
        });
    }

    setupDataSources(): void {
        this.dataSources = this.categoriesArray.controls.map(categoryGroup => {
            const dataSource = new MatTableDataSource((categoryGroup.get('keys') as FormArray).controls);
            dataSource.filterPredicate = (data: AbstractControl, filter: string) => {
                const key = data.get('key').value.toLowerCase();
                const value = data.get('value').value.toLowerCase();
                return key.includes(filter) || value.includes(filter);
            };
            return dataSource;
        });
    }

    applyFilter(filterValue: string): void {
        const normalizedFilter = filterValue ? filterValue.trim().toLowerCase() : null;

        if (!normalizedFilter) {
            this.metaPanelState = { hidden: false, expanded: false };
            this.panelOpenState.fill(false);
            this.dataSources.forEach(ds => ds.filter = '');
            this._cdr.markForCheck();
            return;
        }

        const titleMatch = this.metaGroup.get('title').value.toLowerCase().includes(normalizedFilter);
        const descMatch = this.metaGroup.get('description').value.toLowerCase().includes(normalizedFilter);
        this.metaPanelState.hidden = !(titleMatch || descMatch);
        this.metaPanelState.expanded = !this.metaPanelState.hidden;

        const newPanelState = [...this.panelOpenState];
        this.dataSources.forEach((dataSource, index) => {
            dataSource.filter = normalizedFilter;
            newPanelState[index] = dataSource.filteredData.length > 0;
        });
        this.panelOpenState = newPanelState;

        this._cdr.markForCheck();
    }

    saveChanges(): void {
        if (this.mainForm.invalid || !this.mainForm.dirty) return;
        
        this.isSaving = true;
        this._cdr.markForCheck();

        this._devToolsService.updateMainI18nData(this.mainForm.getRawValue()).pipe(
            finalize(() => {
                this.isSaving = false;
                this._cdr.markForCheck();
            })
        ).subscribe({
            next: (res) => {
                this._devToolsStateService.show(res.message || 'Textos actualizados.');
                this.mainForm.markAsPristine();
            },
            error: (err) => this._notificationService.notifyError(err.error?.message || 'Error al guardar los cambios.')
        });
    }

    revertChanges(): void {
        if (this.initialData) {
            this.categoriesArray.clear();
            this.metaGroup.patchValue(this.initialData.meta);
            this.initialData.categories.forEach(category => {
                const keysFormArray = this._fb.array(
                    category.keys.map(k => this._fb.group({ key: [k.key], value: [k.value] }))
                );
                this.categoriesArray.push(this._fb.group({ name: [category.name], keys: keysFormArray }));
            });
            this.setupDataSources();
            
            this.mainForm.markAsPristine();
            this.searchControl.setValue('', { emitEvent: true });
            
            this._notificationService.notify('Cambios descartados.');
            this._cdr.markForCheck();
        }
    }
}