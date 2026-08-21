import { NgIf } from '@angular/common';
import { Component, OnDestroy, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FwkLoadingBarComponent } from '../../infrastructure/components/loading-bar';
import { NetworkStatusBannerComponent } from '../../../components/network-status-banner/network-status-banner.component';
import { Subject } from 'rxjs';

@Component({
    selector     : 'empty-layout',
    templateUrl  : './empty.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [FwkLoadingBarComponent, NgIf, RouterOutlet, NetworkStatusBannerComponent],
})
export class EmptyLayoutComponent implements OnDestroy
{
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor()
    {
    }


    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }
}
