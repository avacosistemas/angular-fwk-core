import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fwkAnimations } from '../../../layout/infrastructure/animations';
import { TranslatePipe } from '../../../pipe/translate.pipe';
import { LogoComponent } from '../../../components/logo/logo.component';

@Component({
    selector     : 'auth-confirmation-required',
    templateUrl  : './confirmation-required.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fwkAnimations,
    standalone   : true,
    imports      : [RouterLink, TranslatePipe, LogoComponent],
})
export class AuthConfirmationRequiredComponent
{
    /**
     * Constructor
     */
    constructor()
    {
    }
}