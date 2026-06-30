import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { Observable, Subject, takeUntil, of, tap } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FwkMediaWatcherService } from '../../../infrastructure/services/media-watcher';
import { FwkNavigationService, FwkVerticalNavigationComponent } from '../../../infrastructure/components/navigation';
import { Navigation } from '../../../../navigation/navigation.types';
import { NavigationService } from '../../../../navigation/navigation.service';
import { User } from '../../../../auth/user.types';
import { UserService } from '../../../../auth/user.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { UserComponent } from '../../common/user/user.component';
import { FwkLoadingBarComponent } from '../../../infrastructure/components/loading-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SearchButtonComponent } from '../../common/search-button/search-button.component';
import { LogoComponent } from '../../../../components/logo/logo.component';
import { FWK_CONFIG, FwkConfig } from '../../../../model/fwk-config';

import { GenericHttpService } from '../../../../services/generic-http-service/generic-http.service';
import { ActionDefService } from '../../../../services/action-def-service/action-def.service';
import { AuthService } from '../../../../auth/auth.service';
import { I18nService } from '../../../../services/i18n-service/i18n.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from '../../../../services/dialog-service/dialog.service';
import { FWK_LOAD_CRUD_BY_PATH } from '../../../../navigation/navigation.tokens';
import { BasicModalComponent } from '../../../../components/crud/basic-modal/basic-modal.component';
import { I18n } from '../../../../model/i18n';
import { ClusterContextService } from '../../../../services/cluster-context.service';
import { NotificationService } from '../../../../services/notification/notification.service';

@Component({
    selector: 'dense-layout',
    templateUrl: './dense.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet,
        RouterLink,
        FwkLoadingBarComponent,
        FwkVerticalNavigationComponent,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        UserComponent,
        MatTooltipModule,
        SearchButtonComponent,
        LogoComponent
    ],
})
export class DenseLayoutComponent implements OnInit, OnDestroy {
    private _fwkConfig = inject<FwkConfig>(FWK_CONFIG);
    private _loadCrudByPath = inject(FWK_LOAD_CRUD_BY_PATH, { optional: true });

    isScreenSmall?: boolean;
    navigation?: Navigation;
    navigationAppearance: 'default' | 'dense' = 'default';
    user$?: Observable<User>;
    isDevMode: boolean = !this._fwkConfig.production;
    showCollapseSidebarIcon: boolean = true;
    sidebarOpened: boolean = true;

    showClusterSidebar: boolean = false;
    clusterCollapsed: boolean = false;
    currentIdContact: string | null = null;
    currentParentTitle: string | null = null;
    activePath: string = '';
    contactData: any = null;
    clusterConfig: any = null;
    clusterItems: any[] = [];
    clusterActions: any[] = [];
    clusterActionsConditions: any[] = [];

    private cdr = inject(ChangeDetectorRef);
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    private _genericHttpService = inject(GenericHttpService);
    private _actionDefService = inject(ActionDefService);
    private _authService = inject(AuthService);
    private _i18nService = inject(I18nService);
    private _dialog = inject(MatDialog);
    private _dialogService = inject(DialogService);
    private _clusterContextService = inject(ClusterContextService);
    private _notificationService = inject(NotificationService);

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _navigationService: NavigationService,
        private _userService: UserService,
        private _fwkMediaWatcherService: FwkMediaWatcherService,
        private _fwkNavigationService: FwkNavigationService,
    ) {
    }

    ngOnInit(): void {
        this.showCollapseSidebarIcon = this._fwkConfig.sidebar.collapseIcon;
        this.sidebarOpened = this._fwkConfig.sidebar.opened;
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) => {
                this.navigation = navigation;
            });

        this.user$ = this._userService.user$;

        this._fwkMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });

        this._router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() => {
                this._updateClusterState();
            });

        this._updateClusterState();
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    get currentYear(): number {
        return new Date().getFullYear();
    }

    toggleNavigation(name: string): void {
        const navigation = this._fwkNavigationService.getComponent<FwkVerticalNavigationComponent>(name);
        if (navigation) {
            navigation.toggle();
        }
    }

    toggleNavigationAppearance(): void {
        this.navigationAppearance = this.navigationAppearance === 'default' ? 'dense' : 'default';
    }

    private _updateClusterState(): void {
        const urlTree = this._router.parseUrl(this._router.url);
        const queryParams = urlTree.queryParams;
        
        const newIdContact = queryParams['idContact'] || null;
        this.currentParentTitle = queryParams['parentTitle'] || null;

        const primarySegment = urlTree.root.children['primary'];
        if (primarySegment && primarySegment.segments.length > 0) {
            this.activePath = primarySegment.segments[0].path;
        } else {
            this.activePath = '';
        }

        if (newIdContact) {
            (this._loadCrudByPath ? this._loadCrudByPath('perfilIdentificacion') : Promise.resolve(null)).then(parentDef => {
                if (parentDef && parentDef.clusterConfig) {
                    this.clusterConfig = parentDef.clusterConfig;
                    const actionsItems = parentDef.clusterConfig.actionsItems || [];
                    if (actionsItems.length > 0) {
                        this.clusterItems = actionsItems.filter((item: any) => item.displayType === 'menu' || item.displayType === 'sidebar');
                        this.clusterActions = actionsItems.filter((item: any) => item.displayType === 'action');
                    } else {
                        this.clusterItems = parentDef.clusterConfig.navigationItems || [];
                        this.clusterActions = parentDef.clusterConfig.actions || [];
                    }
                    this.clusterActionsConditions = parentDef.clusterConfig.displayedActionsCondition || [];

                    const isClusterPath = this.clusterItems.some(item =>
                        item.path === this.activePath || (!item.path && this.activePath === 'perfilIdentificacion')
                    );
                    this.showClusterSidebar = !!isClusterPath;
                    this._clusterContextService.setClusterActive(this.showClusterSidebar);

                    if (this.showClusterSidebar) {
                        if (this.currentIdContact !== newIdContact) {
                            this.currentIdContact = newIdContact;
                            this._loadContactData();
                        }
                    } else {
                        this.currentIdContact = null;
                        this.contactData = null;
                    }
                    this.cdr.markForCheck();
                }
            }).catch(err => {
                console.error('[DenseLayout] Error loading dynamic cluster config:', err);
            });
        } else {
            this.showClusterSidebar = false;
            this.currentIdContact = null;
            this.contactData = null;
            this._clusterContextService.setClusterActive(false);
            this.cdr.markForCheck();
        }
    }

    private _loadContactData(): void {
        if (!this.currentIdContact) return;

        const url = this._fwkConfig.apiBaseUrl! + 'admin/personas';
        this._genericHttpService.basicGet(url, { idContact: this.currentIdContact }, null, { idContact: 'idContact' })
            .subscribe({
                next: (res) => {
                    const array = Array.isArray(res) ? res : [res];
                    if (array.length > 0) {
                        this.contactData = array[0];
                        if (this.contactData.apellido) {
                            this.currentParentTitle = this.contactData.apellido;
                        }
                    }
                },
                error: (err) => console.error('[DenseLayout] Error loading contact data:', err)
            });
    }

    navigateTo(item: any): void {
        const queryParams: any = {
            idContact: this.currentIdContact,
            parentTitle: this.currentParentTitle
        };
        if (item.actionNameKey !== 'cluster_details_title' && (item.form || item.actionType || item.ws)) {
            queryParams.action = item.actionNameKey;
        }
        const targetPath = item.path || 'perfilIdentificacion';
        this._router.navigate([targetPath], {
            queryParams: queryParams
        });
    }

    isItemActive(item: any): boolean {
        const urlTree = this._router.parseUrl(this._router.url);
        const queryAction = urlTree.queryParams['action'];
        const targetPath = item.path || 'perfilIdentificacion';
        
        const isActionItem = !!(item.form || item.actionType || item.ws);

        if (queryAction) {
            return isActionItem && queryAction === item.actionNameKey;
        } else {
            if (isActionItem) {
                return false;
            }
            if (item.actionNameKey === 'cluster_details_title') {
                return this.activePath === 'perfilIdentificacion';
            }
            return this.activePath === targetPath;
        }
    }

    toggleClusterCollapse(): void {
        this.clusterCollapsed = !this.clusterCollapsed;
    }

    translate(key: string): string {
        if (!key) return '';
        return this._i18nService.translate(key);
    }

    private _prepareAction(action: any): any {
        const cloned = JSON.parse(JSON.stringify(action));
        
        if (cloned.actionNameKey) {
            cloned.actionName = this._i18nService.translate(cloned.actionNameKey);
        }
        
        if (cloned.confirm) {
            if (typeof cloned.confirm === 'object') {
                if (cloned.confirm.messageKey) {
                    const trans = this._i18nService.translate(cloned.confirm.messageKey);
                    cloned.confirm.message = trans !== cloned.confirm.messageKey ? trans : (cloned.confirm.message || this.translate('confirm_operation_default_message'));
                }
            } else if (cloned.confirm === true) {
                const confirmKey = cloned.confirmMessageKey || cloned.confirmMessage;
                let transMsg = this.translate('confirm_operation_default_message');
                if (confirmKey) {
                    const trans = this._i18nService.translate(confirmKey);
                    transMsg = trans !== confirmKey ? trans : (cloned.confirmMessage || transMsg);
                }
                cloned.confirm = {
                    message: transMsg
                };
            }
        }
        
        if (cloned.form) {
            cloned.form.forEach((field: any) => {
                if (field.labelKey) {
                    field.label = this._i18nService.translate(field.labelKey);
                }
            });
        }
        
        return cloned;
    }

    get activeSidebarItems(): any[] {
        if (!this.clusterConfig) return [];
        const items = this.clusterItems || [];
        
        return items.filter(item => {
            if (item.actionSecurity && !this._authService.hasPermission(item.actionSecurity)) {
                return false;
            }
            if (this.contactData) {
                const cond = (this.clusterActionsConditions || []).find(c => c.key === item.actionNameKey);
                if (cond && cond.expression) {
                    const expr = cond.expression;
                    const valueToCompare = this.contactData[expr.key];
                    return valueToCompare === expr.value;
                }
            }
            return true;
        });
    }

    get activeProfileActions(): any[] {
        if (!this.contactData || !this.clusterConfig) return [];
        
        const actions = this.clusterActions || [];
        
        return actions.filter(action => {
            if (action.actionSecurity && !this._authService.hasPermission(action.actionSecurity)) {
                return false;
            }
            
            const cond = (this.clusterActionsConditions || []).find(c => c.key === action.actionNameKey);
            if (cond && cond.expression) {
                const expr = cond.expression;
                const valueToCompare = this.contactData[expr.key];
                return valueToCompare === expr.value;
            }
            
            return true;
        });
    }

    executeAction(action: any): void {
        if (!this.contactData) return;

        const preparedAction = this._prepareAction(action);
        const row = { ...this.contactData };
        
        const idKey = 'idContact';
        row.id = row[idKey];

        const i18nObj = this._i18nService.getDictionary('perfil_identificacion_i18n_def') || 
                        this._i18nService.getDictionary('fwk') || 
                        new I18n();

        if (preparedAction.form || preparedAction.formDef) {
            const data = {
                entity: row,
                config: preparedAction,
                formDef: preparedAction.formDef,
                fields: preparedAction.form || preparedAction.formDef?.fields,
                i18n: i18nObj
            };

            const dialogRef = this._dialog.open(BasicModalComponent, {
                width: '600px',
                maxWidth: '95vw',
                panelClass: 'control-mat-dialog',
                data: data
            });

            dialogRef.afterClosed().subscribe(() => {
                this._loadContactData();
            });
        } else {
            this._actionDefService.submitAction(preparedAction, row, i18nObj, undefined)
                .subscribe({
                    next: (res) => {
                        if (res === null) {
                            return;
                        }
                        if (res && res.hasOwnProperty('ok') && !res.ok) {
                            const errorMsg = preparedAction.ws?.messageError || res.error?.message || this.translate('action_error_default_message');
                            this._notificationService.notifyError(errorMsg);
                            return;
                        }
                        const successMsg = preparedAction.ws?.messageSuccess || this.translate('success_message') || this.translate('action_success_default_message');
                        this._notificationService.notifySuccess(successMsg);
                        const redirectPath = preparedAction.redirectToSuccess || preparedAction.redirectTo;
                        if (redirectPath) {
                            this._router.navigateByUrl(redirectPath);
                        } else {
                            this._loadContactData();
                        }
                    },
                    error: (err) => {
                        console.error('[DenseLayout] Error submitting action:', err);
                        const msg = preparedAction.ws?.messageError || err?.error?.message || err?.message || this.translate('action_error_default_message');
                        this._notificationService.notifyError(msg);
                    }
                });
        }
    }
}