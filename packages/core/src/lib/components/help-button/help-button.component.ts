import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemePalette } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '../../pipe/translate.pipe';

@Component({
    selector: 'help-button, url-help',
    templateUrl: './help-button.component.html',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        TranslatePipe,
    ]
})
export class HelpButtonComponent {
    @Input() urlHelp?: string;
    @Input() url?: string;
    @Input() color: ThemePalette = 'primary';

    get targetUrl(): string | undefined {
        return this.urlHelp || this.url;
    }

    openHelp(): void {
        const link = this.targetUrl;
        if (link) {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    }
}
