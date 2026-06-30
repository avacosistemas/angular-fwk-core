import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ThemePalette } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../pipe/translate.pipe';

@Component({
    selector: 'back-button',
    templateUrl: './back-button.component.html',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        TranslatePipe, 
    ]
})
export class BackButtonComponent {

    @Input() color: ThemePalette;

    constructor(private location: Location) {}

    goBack(): void {
        this.location.back();
    }
}