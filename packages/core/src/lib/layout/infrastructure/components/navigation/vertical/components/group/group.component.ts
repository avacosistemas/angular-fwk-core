import { BooleanInput } from '@angular/cdk/coercion';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FwkNavigationService } from '../../../navigation.service';
import { FwkNavigationItem } from '../../../navigation.types';
import { FwkVerticalNavigationBasicItemComponent } from '../basic/basic.component';
import { FwkVerticalNavigationCollapsableItemComponent } from '../collapsable/collapsable.component';
import { FwkVerticalNavigationDividerItemComponent } from '../divider/divider.component';
import { FwkVerticalNavigationSpacerItemComponent } from '../spacer/spacer.component';
import { FwkVerticalNavigationComponent } from '../../vertical.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'fwk-vertical-navigation-group-item',
    templateUrl    : './group.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone     : true,
    imports        : [NgClass, NgIf, MatIconModule, NgFor, FwkVerticalNavigationBasicItemComponent, FwkVerticalNavigationCollapsableItemComponent, FwkVerticalNavigationDividerItemComponent, forwardRef(() => FwkVerticalNavigationGroupItemComponent), FwkVerticalNavigationSpacerItemComponent],
})
export class FwkVerticalNavigationGroupItemComponent implements OnInit, OnDestroy
{
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_autoCollapse: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    @Input() autoCollapse!: boolean;
    @Input() item!: FwkNavigationItem;
    @Input() name!: string;

    private _fwkVerticalNavigationComponent!: FwkVerticalNavigationComponent;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fwkNavigationService: FwkNavigationService,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Get the parent navigation component
        this._fwkVerticalNavigationComponent = this._fwkNavigationService.getComponent(this.name);

        // Subscribe to onRefreshed on the navigation component
        this._fwkVerticalNavigationComponent.onRefreshed.pipe(
            takeUntil(this._unsubscribeAll),
        ).subscribe(() =>
        {
            // Mark for check
            this._changeDetectorRef.markForCheck();
        });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }
}
