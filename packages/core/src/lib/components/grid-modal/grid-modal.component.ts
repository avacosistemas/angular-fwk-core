import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GridDef } from '../../model/component-def/grid-def';
import { CrudTableComponent } from '../crud/crud-table/crud-table.component';
import { TranslatePipe } from '../../pipe/translate.pipe'; 

export interface GridModalData {
    title?: string;
    entities: any[];
    gridDef: GridDef;
}

@Component({
     selector: 'fwk-grid-modal-component',
    templateUrl: './grid-modal.component.html',
    styleUrls: ['./grid-modal.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        CrudTableComponent,
        TranslatePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridModalComponent implements OnInit {

    dataSource: MatTableDataSource<any>;

    constructor(
        public dialogRef: MatDialogRef<GridModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: GridModalData
    ) {
        this.dataSource = new MatTableDataSource<any>();
    }

    ngOnInit(): void {
        if (this.data && Array.isArray(this.data.entities)) {
            this.dataSource = new MatTableDataSource<any>(this.data.entities);
        }
    }

    onNoClick(): void {
        this.dialogRef.close();
    }
}