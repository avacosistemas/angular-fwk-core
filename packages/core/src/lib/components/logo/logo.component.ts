import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FWK_CONFIG } from '../../model/fwk-config';

@Component({
    selector: 'fwk-logo',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div [class]="finalContainerClass" class="flex items-center gap-2">
             <img [src]="logoUrl" 
                  [class]="finalImgClass" 
                  [alt]="fwkConfig.brand.name">

             <h1 *ngIf="finalShowName" 
                 [class]="finalNameClass">
                 {{ fwkConfig.brand.name }}
             </h1>
        </div>
    `
})
export class LogoComponent {
    public fwkConfig = inject(FWK_CONFIG);

    @Input() context: 'auth' | 'sidebar' = 'auth';
    @Input() size: 'normal' | 'small' = 'normal';
    @Input() type: 'normal' | 'icon' = 'normal';
    @Input() showName?: boolean;
    @Input() src?: string;

    @Input() containerClass?: string;
    @Input() imgClass?: string;
    @Input() nameClass?: string;

    private get _style(): { showName: boolean; containerClass: string; imgClass: string; nameClass: string } {
        return this.fwkConfig.brand.style[this.context];
    }

    get finalShowName(): boolean {
        if (this.type === "icon") {
            return false;
        }
        return this.showName ?? this._style.showName;
    }

    get finalContainerClass(): string {
        if (this.type === "icon") {
            return '';
        }
        return this.containerClass ?? this._style.containerClass;
    }

    get finalImgClass(): string {
        return this.imgClass ?? this._style.imgClass;
    }

    get finalNameClass(): string {
        return this.nameClass ?? this._style.nameClass;
    }

    get logoUrl(): string {
        if (this.src) return this.src;
        if (this.size === 'small' || this.type === 'icon') return this.fwkConfig.brand.isologo;
        if (this.context === 'sidebar') return this.fwkConfig.brand.logo.sidebar;
        return this.fwkConfig.brand.logo.auth;
    }
}