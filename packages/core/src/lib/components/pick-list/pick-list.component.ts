import { Component, Input, forwardRef, OnInit, Injector, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { AbstractComponent } from '../abstract-component.component';

@Component({
     selector: 'fwk-pick-list',
    templateUrl: './pick-list.component.html',
    styleUrls: ['./pick-list.component.scss'],
    standalone: true,
    imports: [
        CommonModule, FormsModule, MatCardModule, MatListModule, MatCheckboxModule, MatFormFieldModule,
        MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe
    ],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PickListComponent), multi: true }
    ]
})
export class PickListComponent extends AbstractComponent implements ControlValueAccessor, OnInit, OnChanges {

    @Input() elementLabel: string = 'name';
    @Input() titleFrom!: string;
    @Input() titleTo!: string;
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

    private _masterAllItemsMap = new Map<any, any>();

    availableItems: any[] = [];
    selectedItems: any[] = [];

    fromDataSelected: any[] = [];
    toDataSelected: any[] = [];

    isDisabled: boolean = false;
    filterValue: string = '';

    onChange: (value: any[] | null) => void = () => { };
    onTouch: () => void = () => { };

    constructor(injector: Injector, private cdr: ChangeDetectorRef) {
        super(injector);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['allItems']) {
            this.mergeIntoMasterList(changes['allItems'].currentValue);
            this.applyFallbackIfNecessary();
            this.updateLists();
        }
        if (changes['fallback']) {
            this.applyFallbackIfNecessary();
            this.updateLists();
        }
    }

    override ngOnInit(): void {
        super.ngOnInit();
        if (!this.titleFrom) this.titleFrom = this.translate('picklist_available_title');
        if (!this.titleTo) this.titleTo = this.translate('picklist_selected_title');
    }

    override getI18nName(): string { return 'fwk'; }

    writeValue(value: any[] | null): void {
        this.selectedItems = Array.isArray(value) ? [...value] : [];
        if (this.selectedItems.length > 0) {
            this.fallbackApplied = true;
        }
        this.mergeIntoMasterList(this.selectedItems);
        this.applyFallbackIfNecessary();
        this.updateLists();
        this.cdr.markForCheck();
    }

    private applyFallbackIfNecessary(): void {
        if (this.fallback && !this.fallbackApplied && Array.isArray(this.allItems) && this.allItems.length > 0 && (!this.selectedItems || this.selectedItems.length === 0)) {
            const fallbackSelected = this.allItems.filter(item => item && Boolean(item[this.fallback!]) === true);
            if (fallbackSelected.length > 0) {
                this.selectedItems = [...fallbackSelected];
                this.fallbackApplied = true;
                this.notifyChanges();
            }
        }
    }

    private mergeIntoMasterList(items: any[]): void {
        if (!Array.isArray(items)) return;

        items.forEach(item => {
            const id = this.getItemId(item);
            if (!this._masterAllItemsMap.has(id)) {
                this._masterAllItemsMap.set(id, item);
            }
        });
    }

    registerOnChange(fn: (value: any[] | null) => void): void { this.onChange = fn; }
    registerOnTouched(fn: () => void): void { this.onTouch = fn; }
    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
        this.cdr.markForCheck();
    }

    isFromSelected(item: any): boolean {
        if (!this.fromDataSelected || !item) return false;
        return this.fromDataSelected.some(s => this.compareFn(s, item));
    }

    toggleFromItem(item: any): void {
        if (this.isDisabled) return;
        if (this.isFromSelected(item)) {
            this.fromDataSelected = this.fromDataSelected.filter(s => !this.compareFn(s, item));
        } else {
            this.fromDataSelected = [...this.fromDataSelected, item];
        }
        this.cdr.markForCheck();
    }

    isToSelected(item: any): boolean {
        if (!this.toDataSelected || !item) return false;
        return this.toDataSelected.some(s => this.compareFn(s, item));
    }

    toggleToItem(item: any): void {
        if (this.isDisabled) return;
        if (this.isToSelected(item)) {
            this.toDataSelected = this.toDataSelected.filter(s => !this.compareFn(s, item));
        } else {
            this.toDataSelected = [...this.toDataSelected, item];
        }
        this.cdr.markForCheck();
    }

    private updateLists(): void {
        const masterList = Array.from(this._masterAllItemsMap.values());
        if (masterList.length === 0) {
            this.availableItems = [];
            return;
        }

        const selectedIds = new Set((this.selectedItems || []).map(item => this.getItemId(item)));
        const available = masterList.filter(item => !selectedIds.has(this.getItemId(item)));

        const filterText = this.filterValue.trim().toLowerCase();
        if (filterText) {
            this.availableItems = available.filter(item =>
                this.getNameElementList(item).toLowerCase().includes(filterText)
            );
        } else {
            this.availableItems = available;
        }
    }

    private notifyChanges(): void {
        const valueToEmit = this.selectedItems.length > 0 ? this.selectedItems : null;
        this.onChange(valueToEmit);
        this.onTouch();
    }

    transferTo(): void {
        this.selectedItems = [...this.selectedItems, ...this.fromDataSelected];
        this.fromDataSelected = [];
        this.updateLists();
        this.notifyChanges();
    }

    transferFrom(): void {
        const toTransferIds = new Set(this.toDataSelected.map(item => this.getItemId(item)));
        this.selectedItems = this.selectedItems.filter(item => !toTransferIds.has(this.getItemId(item)));
        this.toDataSelected = [];
        this.updateLists();
        this.notifyChanges();
    }

    transferToAll(): void {
        this.selectedItems = Array.from(this._masterAllItemsMap.values());
        this.fromDataSelected = [];
        this.updateLists();
        this.notifyChanges();
    }

    transferFromAll(): void {
        this.selectedItems = [];
        this.toDataSelected = [];
        this.updateLists();
        this.notifyChanges();
    }

    applyFilter(event?: Event): void {
        if (event) this.filterValue = (event.target as HTMLInputElement).value;
        this.updateLists();
    }

    getNameElementList(el: any): string {
        return el && this.elementLabel ? el[this.elementLabel] : '';
    }

    private getItemId(item: any): any {
        if (!item) return null;
        if (typeof item === 'object') {
            if (item.itemId !== undefined && item.itemId !== null) return item.itemId;
            if (item.id !== undefined && item.id !== null && item.id !== 0) return item.id;
            if (item.nombre) return item.nombre;
        }
        return item;
    }

    compareFn(c1: any, c2: any): boolean {
        const id1 = this.getItemId(c1);
        const id2 = this.getItemId(c2);
        return id1 !== null && id2 !== null ? id1 === id2 : c1 === c2;
    }
}