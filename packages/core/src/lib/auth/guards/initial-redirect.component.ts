import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'fwk-initial-redirect',
    template: '',
    standalone: true,
})
export class InitialRedirectComponent implements OnInit {
    private readonly _router = inject(Router);

    ngOnInit(): void {
        this._router.navigate(['/sign-in']);
    }
}