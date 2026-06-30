import {
    Component, OnInit, ViewChild, ViewContainerRef,
    Injector, ChangeDetectorRef, OnDestroy, inject, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, Subscription, takeUntil } from 'rxjs';

import { PageComponentDef } from '../../model/component-def/page-component-def';
import { ActionDef } from '../../model/component-def/action-def';
import { CustomPageComponent } from '../../model/page-component.interface';
import { TranslatePipe } from '../../pipe/translate.pipe';
import { BackButtonComponent } from '../back-button/back-button.component';
import { AuthService } from '../../auth/auth.service';
import { I18nService } from '../../services/i18n-service/i18n.service';
import { BreadcrumbComponent } from '../../navigation/breadcrumb/breadcrumb.component';

@Component({
    selector: 'fwk-page-component-wrapper',
    standalone: true,
    imports: [
        CommonModule, MatButtonModule, MatIconModule,
        MatTooltipModule, MatProgressSpinnerModule,
        TranslatePipe, BackButtonComponent,
        BreadcrumbComponent
    ],
    templateUrl: './page-component-wrapper.component.html'
})
export class PageComponentWrapperComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('contentContainer', { read: ViewContainerRef })
    contentContainer!: ViewContainerRef;

    definition!: PageComponentDef;
    pageTitle: string = '';
    parentTitle: string | null = null;
    actionLoadingStates = new Map<string, boolean>();

    private destroy$ = new Subject<void>();
    private componentInstance: CustomPageComponent | null = null;
    public componentSubscription: Subscription | null = null;
    private route = inject(ActivatedRoute);
    private cdr = inject(ChangeDetectorRef);
    private authService = inject(AuthService);
    private i18nService = inject(I18nService);
    private injector = inject(Injector);

    ngOnInit(): void {
        const defData = this.route.snapshot.data['definition'];

        if (!defData) {
            console.error('[PageComponentWrapper] No se encontró la definición de página en los datos de la ruta.');
            return;
        }

        this.definition = { ...defData };
        if (defData.actions) {
            this.definition.actions = defData.actions.map(action => ({ ...action }));
        }

        const i18n = this.i18nService.getDictionary(this.definition.i18n.name);
        this.pageTitle = i18n?.translate?.('page_title') || this.definition.name;

        if (i18n && this.definition.actions) {
            this.definition.actions.forEach((action: ActionDef) => {
                if (action.actionNameKey) {
                    action.actionName = i18n.translate?.(action.actionNameKey) ?? action.actionNameKey;
                }
            });
        }

        this.route.queryParams
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                this.parentTitle = params['parentTitle'] || null;
                this.cdr.markForCheck();
            });
    }

    ngAfterViewInit(): void {
        if (!this.contentContainer) {
            console.error("CRITICAL: contentContainer no se encontró en ngAfterViewInit.");
            return;
        }
        setTimeout(() => this.loadDynamicComponent(), 0);
    }

    private loadDynamicComponent(): void {
        if (!this.definition || !this.definition.component || !this.contentContainer) {
            return;
        }

        this.contentContainer.clear();
        const componentRef = this.contentContainer.createComponent(this.definition.component, {
            injector: this.injector
        });

        if (componentRef.instance) {
            this.componentInstance = componentRef.instance;
            if (componentRef.instance.actionStateChange) {
                this.componentSubscription = this.componentInstance.actionStateChange
                    .pipe(takeUntil(this.destroy$))
                    .subscribe((update) => {
                        this.updateActionState(update.key, update.changes);
                    });
            }
        }
        this.cdr.detectChanges();
    }

    private updateActionState(key: string, changes: Partial<ActionDef>): void {
        const action = this.definition.actions?.find(a => a.actionNameKey === key);
        if (action) {
            Object.assign(action, changes);
            this.cdr.markForCheck();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getVisibleActions(): ActionDef[] {
        if (!this.definition.actions) return [];

        return this.definition.actions.filter(action =>
            this.authService.hasPermission(action.actionSecurity) && !action.hidden
        );
    }

    executeAction(action: ActionDef): void {
        if (this.componentInstance) {
            this.componentInstance.onAction(action);
        } else {
            console.error("No se puede ejecutar la acción porque la instancia del componente hijo no es válida o no implementa 'onAction'.");
        }
    }
}