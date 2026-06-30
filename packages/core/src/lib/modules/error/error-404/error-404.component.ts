import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../pipe/translate.pipe';

@Component({
    selector: 'error-404',
    standalone: true,
    imports: [CommonModule, RouterLink, TranslatePipe],
    templateUrl: './error-404.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class Error404Component {
    
    constructor(
        private _location: Location,
        private _router: Router
    ) {}

    goBack(): void {
        this._location.back();
    }

    goHome(): void {
        this._router.navigate(['/']);
    }
}