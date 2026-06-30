import { Component, ChangeDetectionStrategy, inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';
import { SearchResult, SearchService } from '../../../../services/search/search.service';
import { TranslatePipe } from '../../../../pipe/translate.pipe';

@Component({
     selector: 'fwk-search-modal',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatInputModule,
        MatIconModule, MatListModule, MatDialogModule, MatButtonModule, TranslatePipe
    ],
    templateUrl: './search-modal.component.html',
    styles: [
        `
      .search-modal-panel .mat-mdc-dialog-container .mdc-dialog__surface {
          border-radius: 0.75rem !important; /* 12px */
      }
    `
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchModalComponent implements OnInit, AfterViewInit {
    private dialogRef = inject(MatDialogRef<SearchModalComponent>);
    private searchService = inject(SearchService);
    private router = inject(Router);

    @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

    searchControl = new FormControl('');
    results$!: Observable<SearchResult[]>;

    ngOnInit(): void {
        this.results$ = this.searchControl.valueChanges.pipe(
            startWith(''),
            debounceTime(500),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term || term.length < 2) {
                    return of([]);
                }
                return this.searchService.search(term);
            })
        );
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.searchInput.nativeElement.focus(), 100);

        this.dialogRef.afterClosed().subscribe(() => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        });
    }

    navigateTo(result: SearchResult): void {
        if (result?.link) {
            this.router.navigateByUrl(result.link);
            this.closeModal();
        }
    }

    closeModal(): void {
        this.dialogRef.close();
    }
}