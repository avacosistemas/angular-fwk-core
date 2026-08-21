import { Component, Input, forwardRef, Injector, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
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
        MatIconModule,
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
export class SimplePickListComponent extends AbstractComponent implements ControlValueAccessor, OnInit, OnChanges {

    @Input() elementLabel: string = 'name';
    @Input() titleFrom!: string;
    @Input() allItems: any[] = [];
    @Input() icon?: string;
    @Input() showSelectAll: boolean = true;
    @Input() loading: boolean = false;
    @Input() fallback?: string;
    
    @Input() errorMessage: string | null = null; 

    private fallbackApplied: boolean = false;

    get showSkeleton(): boolean {
        return this.loading || !this.allItems;
    } 

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

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['allItems'] || changes['fallback']) {
            this.applyFallbackIfNecessary();
        }
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
        if (this.selectedItems.length > 0) {
            this.fallbackApplied = true;
        } else {
            this.applyFallbackIfNecessary();
        }
        this.cdr.markForCheck(); 
    }

    private applyFallbackIfNecessary(): void {
        if (this.fallback && !this.fallbackApplied && Array.isArray(this.allItems) && this.allItems.length > 0 && (!this.selectedItems || this.selectedItems.length === 0)) {
            const fallbackSelected = this.allItems.filter(item => item && Boolean(item[this.fallback!]) === true);
            if (fallbackSelected.length > 0) {
                this.selectedItems = [...fallbackSelected];
                this.fallbackApplied = true;
                this.notifyChange();
            }
        }
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

    isSelected(item: any): boolean {
        if (!this.selectedItems || !item) return false;
        return this.selectedItems.some(s => this.compareFn(s, item));
    }

    toggleItem(item: any): void {
        if (this.isDisabled) return;
        this.fallbackApplied = true;
        if (this.isSelected(item)) {
            this.selectedItems = this.selectedItems.filter(s => !this.compareFn(s, item));
        } else {
            this.selectedItems = [...this.selectedItems, item];
        }
        this.notifyChange();
    }

    toggleSelectAll(): void {
        if (this.isDisabled) return;
        this.fallbackApplied = true;
        if (this.isAllSelected()) {
            this.selectedItems = [];
        } else {
            this.selectedItems = [...(this.allItems || [])];
        }
        this.notifyChange();
    }

    private notifyChange(): void {
        const val = this.selectedItems.length > 0 ? this.selectedItems : null;
        this.onChange(val);
        this.onTouch();
        this.cdr.markForCheck();
    }

    isAllSelected(): boolean {
        return !!(this.allItems?.length > 0 && this.selectedItems?.length === this.allItems.length);
    }

    getNameElementList(element: any): string {
        return element && this.elementLabel ? element[this.elementLabel] : '';
    }

    compareFn(c1: any, c2: any): boolean {
        if (!c1 || !c2) return c1 === c2;
        if (typeof c1 === 'object' && typeof c2 === 'object') {
            if (c1.itemId !== undefined && c2.itemId !== undefined && c1.itemId !== null && c2.itemId !== null) {
                return c1.itemId === c2.itemId;
            }
            if (c1.id !== undefined && c2.id !== undefined && c1.id !== null && c2.id !== null && c1.id !== 0 && c2.id !== 0) {
                return c1.id === c2.id;
            }
            if (c1.nombre && c2.nombre) {
                return c1.nombre === c2.nombre;
            }
        }
        return c1 === c2;
    }
}