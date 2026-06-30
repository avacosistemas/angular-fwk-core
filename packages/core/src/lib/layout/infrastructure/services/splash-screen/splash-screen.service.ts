import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';

@Injectable({providedIn: 'root'})
export class FwkSplashScreenService {
    constructor(
        @Inject(DOCUMENT) private _document: any,
        private _router: Router,
    ) {
        this._router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                take(1),
            )
            .subscribe(() => {
                this._document.body.classList.add('fwk-splash-screen-hidden');
            });
    }
}
