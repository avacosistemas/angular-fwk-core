import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslatePipe } from '../../pipe/translate.pipe';

@Component({
  selector: 'fwk-network-status-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  animations: [
    trigger('bannerAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', opacity: 0, maxHeight: '0px' }),
        animate('350ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(0)', opacity: 1, maxHeight: '60px' }))
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1, maxHeight: '60px' }),
        animate('350ms cubic-bezier(0.4, 0.0, 0.2, 1)', style({ transform: 'translateY(-100%)', opacity: 0, maxHeight: '0px' }))
      ])
    ])
  ],
  template: `
    <div *ngIf="status !== 'hidden'"
         [@bannerAnimation]
         class="w-full relative z-[9999] flex items-center justify-center py-2.5 px-4 shadow-sm overflow-hidden text-sm font-semibold tracking-wide border-b border-black/10"
         [ngClass]="{
           'bg-red-600 !text-white': status === 'offline',
           'bg-emerald-600 !text-white': status === 'restored'
         }">
      <div class="flex items-center gap-2 max-w-7xl mx-auto !text-white">
        <mat-icon class="icon-size-5 !text-white !fill-current" [svgIcon]="status === 'offline' ? 'heroicons_outline:wifi' : 'heroicons_outline:check-circle'"></mat-icon>
        <span class="!text-white font-semibold text-sm">
          {{ status === 'offline' ? ('network_banner_offline' | translate) : ('network_banner_restored' | translate) }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class NetworkStatusBannerComponent implements OnInit, OnDestroy {
  status: 'offline' | 'restored' | 'hidden' = 'hidden';
  private restoreTimeout: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      if (!navigator.onLine) {
        this.status = 'offline';
      }
      window.addEventListener('offline', this.onOffline);
      window.addEventListener('online', this.onOnline);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('offline', this.onOffline);
      window.removeEventListener('online', this.onOnline);
    }
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
    }
  }

  private onOffline = (): void => {
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
    }
    this.status = 'offline';
    this.cdr.markForCheck();
  };

  private onOnline = (): void => {
    if (this.status === 'offline') {
      this.status = 'restored';
      this.cdr.markForCheck();
      this.restoreTimeout = setTimeout(() => {
        this.status = 'hidden';
        this.cdr.markForCheck();
      }, 3500);
    }
  };
}
