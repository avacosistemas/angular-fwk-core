import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { SearchModalComponent } from '../search-modal/search-modal.component';
import { AbstractAuthService } from '../../../../auth/abstract-auth.service';
import { TranslatePipe } from '../../../../pipe/translate.pipe';
import { FWK_CONFIG } from '../../../../model/fwk-config';

@Component({
    selector: 'fwk-search-button',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, TranslatePipe],
    templateUrl: './search-button.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchButtonComponent implements OnInit {
    private dialog = inject(MatDialog);
    private authService = inject(AbstractAuthService);
    private fwkConfig = inject(FWK_CONFIG);

    searchEnabled = false;

    ngOnInit(): void {
        this.authService.authenticated$.subscribe(isAuthenticated => {
            this.searchEnabled = isAuthenticated && this.fwkConfig.search.showButton;
        });
    }

    openSearchModal(event: MouseEvent): void {
        this.dialog.open(SearchModalComponent, {
            width: '600px',
            maxWidth: '90vw',
            panelClass: 'search-modal-panel'
        });

        if (event.currentTarget) {
            (event.currentTarget as HTMLElement).blur();
        }
    }
}