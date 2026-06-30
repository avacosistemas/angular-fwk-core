import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FWK_CONFIG } from '../../model/fwk-config';
import { LogoComponent } from '../../components/logo/logo.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '../../pipe/translate.pipe';

@Component({
    selector: 'signed-in-redirect',
    template: `
        <div class="flex flex-col flex-auto items-center sm:justify-center min-w-0 h-screen bg-gray-50 dark:bg-gray-900">
            <div class="w-full sm:w-auto py-8 px-4 sm:p-12 sm:rounded-2xl sm:shadow sm:bg-card">
                <div class="w-full max-w-80 sm:w-80 mx-auto sm:mx-0 flex flex-col items-center">
                    <fwk-logo context="auth" size="small" type="icon"></fwk-logo>
                    
                    <div class="mt-8 text-2xl font-extrabold tracking-tight leading-tight text-center text-gray-800 dark:text-gray-100">
                        {{ 'signed_in_title' | translate }}
                    </div>
                    
                    <div class="mt-6 flex items-center justify-center">
                        <mat-spinner [diameter]="32"></mat-spinner>
                    </div>
                    
                    <div class="mt-4 text-center text-secondary font-medium text-sm">
                        {{ 'signed_in_redirecting' | translate }}
                    </div>
                </div>
            </div>
        </div>
    `,
    standalone: true,
    imports: [LogoComponent, MatProgressSpinnerModule, TranslatePipe],
})
export class SignedInRedirectComponent implements OnInit {
    private _router = inject(Router);
    private _fwkConfig = inject(FWK_CONFIG);

    ngOnInit(): void {
        const url = (!this._fwkConfig.routing.welcomeDashboard && this._fwkConfig.routing.defaultRedirect)
            ? this._fwkConfig.routing.defaultRedirect
            : '/welcome';
        this._router.navigateByUrl(url);
    }
}
