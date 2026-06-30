import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { TranslatePipe } from '../../../pipe/translate.pipe';

@Component({
    selector: 'fwk-error-403',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './error-403.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class Error403Component implements OnInit {

    private previousUrl: string = '/';

    constructor(
        private _router: Router
    ) {}

    ngOnInit(): void {
        this._router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                take(1)
            )
            .subscribe((event: NavigationEnd) => {
                const navigation = this._router.getCurrentNavigation();
                if (navigation?.previousNavigation) {
                    const previousUrl = navigation.previousNavigation.finalUrl?.toString();
                    if (previousUrl && previousUrl !== '/403' && previousUrl !== '/') {
                        this.previousUrl = previousUrl;
                    }
                }
            });
    }

    goBack(): void {
        this._router.navigateByUrl(this.previousUrl);
    }

    goHome(): void {
        this._router.navigate(['/']);
    }
}