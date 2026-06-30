import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { Breadcrumb, BreadcrumbService } from './breadcrumb.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'fwk-breadcrumb',
    standalone: true,
    imports: [CommonModule, RouterModule, MatIconModule, TranslatePipe],
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
    private _breadcrumbService = inject(BreadcrumbService);
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    breadcrumbs: Breadcrumb[] = [];

    ngOnInit(): void {
        this._breadcrumbService.breadcrumbs$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((breadcrumbs) => {
                this.breadcrumbs = breadcrumbs;
            });
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}
