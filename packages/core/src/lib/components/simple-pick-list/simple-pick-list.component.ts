import { Component, Input, ViewChild, forwardRef, Injector, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatListModule, MatSelectionList } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../pipe/translate.pipe';

import { AbstractComponent } from '../abstract-component.component';
import { SomePipe } from '../../pipe/some.pipe';

@Component({
     selector: 'fwk-simple-pick-list',
    templateUrl: './simple-pick-list.component.html',
    styleUrls: ['./simple-pick-list.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatListModule,
        MatCheckboxModule,
        SomePipe,
        TranslatePipe,
        MatTooltipModule,
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => SimplePickListComponent),
            multi: true
        }
    ]
})
export class SimplePickListComponent extends AbstractComponent implements ControlValueAccessor, OnInit {

    @Input() elementLabel: string = 'name';
    @Input() titleFrom!: string;
    @Input() allItems: any[] = [];
    
    @Input() errorMessage: string | null = null; 

    @ViewChild('list') list!: MatSelectionList;

    selectedItems: any[] = [];
    isDisabled: boolean = false;

    onChange: (value: any[] | null) => void = () => { };
    onTouch: () => void = () => { };

    constructor(
        injector: Injector,
        private cdr: ChangeDetectorRef 
    ) {
        super(injector);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        if (!this.titleFrom) {
            this.titleFrom = this.translate('simple_picklist_default_title');
        }
    }

    override getI18nName(): string {
        return 'fwk';
    }

    writeValue(value: any[] | null): void {
        this.selectedItems = Array.isArray(value) ? [...value] : [];
        this.cdr.markForCheck(); 
    }

    registerOnChange(fn: (value: any[] | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouch = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this.cdr.markForCheck(); 
    }

    onSelectionChange(): void {
        this.selectedItems = this.list.selectedOptions.selected.map(option => option.value);
        this.onChange(this.selectedItems.length > 0 ? this.selectedItems : null);
        this.onTouch();
    }

    toggleSelectAll(): void {
        if (this.isAllSelected()) {
            this.list.deselectAll();
        } else {
            this.list.selectAll();
        }
        this.onSelectionChange();
    }

    isAllSelected(): boolean {
        return this.allItems?.length > 0 && this.selectedItems?.length === this.allItems.length;
    }

    getNameElementList(element: any): string {
        return element && this.elementLabel ? element[this.elementLabel] : '';
    }

    compareFn(c1: any, c2: any): boolean {
        return c1 && c2 ? (c1.id === c2.id) : (c1 === c2);
    }
}