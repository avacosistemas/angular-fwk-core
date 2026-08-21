import { Component, ViewEncapsulation, inject } from '@angular/core';
import { NgIf, NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { LogoComponent } from '../../../components/logo/logo.component';
import { FWK_CONFIG, FwkConfig } from '../../../model/fwk-config';

@Component({
    selector     : 'auth-confirmation-required',
    templateUrl  : './confirmation-required.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fwkAnimations,
    standalone   : true,
    imports      : [NgIf, NgStyle, RouterLink, TranslatePipe, LogoComponent],
})
export class AuthConfirmationRequiredComponent
{
    public fwkConfig = inject<FwkConfig>(FWK_CONFIG);

    constructor()
    {
    }
}