import { animate, AnimationBuilder, AnimationPlayer, style } from '@angular/animations';
import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { DOCUMENT, NgFor, NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostBinding, HostListener, Inject, Input, OnChanges, OnDestroy, OnInit, Output, QueryList, Renderer2, SimpleChanges, ViewChild, ViewChildren, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { fwkAnimations } from '../../../animations';
import { FwkNavigationService } from '../navigation.service';
import { FwkNavigationItem, FwkVerticalNavigationAppearance, FwkVerticalNavigationMode, FwkVerticalNavigationPosition } from '../navigation.types';
import { FwkVerticalNavigationAsideItemComponent } from './components/aside/aside.component';
import { FwkVerticalNavigationBasicItemComponent } from './components/basic/basic.component';
import { FwkVerticalNavigationCollapsableItemComponent } from './components/collapsable/collapsable.component';
import { FwkVerticalNavigationDividerItemComponent } from './components/divider/divider.component';
import { FwkVerticalNavigationGroupItemComponent } from './components/group/group.component';
import { FwkVerticalNavigationSpacerItemComponent } from './components/spacer/spacer.component';
import { FwkScrollbarDirective } from '../../../directives/scrollbar/scrollbar.directive';
import { FwkUtilsService } from '../../../services/utils/utils.service';
import { delay, filter, merge, ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
    selector: 'fwk-vertical-navigation',
    templateUrl    : './vertical.component.html',
    styleUrls      : ['./vertical.component.scss'],
    animations     : fwkAnimations,
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs       : 'FwkVerticalNavigation',
    standalone     : true,
    imports        : [FwkScrollbarDirective, NgFor, NgIf, FwkVerticalNavigationAsideItemComponent, FwkVerticalNavigationBasicItemComponent, FwkVerticalNavigationCollapsableItemComponent, FwkVerticalNavigationDividerItemComponent, FwkVerticalNavigationGroupItemComponent, FwkVerticalNavigationSpacerItemComponent],
})
export class FwkVerticalNavigationComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy
{
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_inner: BooleanInput;
    static ngAcceptInputType_opened: BooleanInput;
    static ngAcceptInputType_transparentOverlay: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    @Input() appearance: FwkVerticalNavigationAppearance = 'default';
    @Input() autoCollapse: boolean = true;
    @Input() inner: boolean = false;
    @Input() mode: FwkVerticalNavigationMode = 'side';
    @Input() name: string = this._fwkUtilsService.randomId();
    @Input() navigation!: FwkNavigationItem[];
    @Input() opened: boolean = true;
    @Input() position: FwkVerticalNavigationPosition = 'left';
    @Input() transparentOverlay: boolean = false;
    @Output() readonly appearanceChanged: EventEmitter<FwkVerticalNavigationAppearance> = new EventEmitter<FwkVerticalNavigationAppearance>();
    @Output() readonly modeChanged: EventEmitter<FwkVerticalNavigationMode> = new EventEmitter<FwkVerticalNavigationMode>();
    @Output() readonly openedChanged: EventEmitter<boolean> = new EventEmitter<boolean>();
    @Output() readonly positionChanged: EventEmitter<FwkVerticalNavigationPosition> = new EventEmitter<FwkVerticalNavigationPosition>();
    @ViewChild('navigationContent') private _navigationContentEl!: ElementRef;

    activeAsideItemId: string | null = null;
    onCollapsableItemCollapsed: ReplaySubject<FwkNavigationItem> = new ReplaySubject<FwkNavigationItem>(1);
    onCollapsableItemExpanded: ReplaySubject<FwkNavigationItem> = new ReplaySubject<FwkNavigationItem>(1);
    onRefreshed: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    private _animationsEnabled: boolean = false;
    private _asideOverlay: HTMLElement | null = null;
    private readonly _handleAsideOverlayClick: any;
    private readonly _handleOverlayClick: any;
    private _hovered: boolean = false;
    private _mutationObserver!: MutationObserver;
    private _overlay: HTMLElement | null = null;
    private _player!: AnimationPlayer;
    private _scrollStrategy: ScrollStrategy = this._scrollStrategyOptions.block();
    private _FwkScrollbarDirectives!: QueryList<FwkScrollbarDirective>;
    private _FwkScrollbarDirectivesSubscription!: Subscription;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _animationBuilder: AnimationBuilder,
        private _changeDetectorRef: ChangeDetectorRef,
        @Inject(DOCUMENT) private _document: Document,
        private _elementRef: ElementRef,
        private _renderer2: Renderer2,
        private _router: Router,
        private _scrollStrategyOptions: ScrollStrategyOptions,
        private _fwkNavigationService: FwkNavigationService,
        private _fwkUtilsService: FwkUtilsService,
    )
    {
        this._handleAsideOverlayClick = (): void =>
        {
            this.closeAside();
        };
        this._handleOverlayClick = (): void =>
        {
            this.close();
        };
    }


    /**
     * Host binding for component classes
     */
    @HostBinding('class') get classList(): any
    {
        /* eslint-disable @typescript-eslint/naming-convention */
        return {
            'fwk-vertical-navigation-animations-enabled'             : this._animationsEnabled,
            [`fwk-vertical-navigation-appearance-${this.appearance}`]: true,
            'fwk-vertical-navigation-hover'                          : this._hovered,
            'fwk-vertical-navigation-inner'                          : this.inner,
            'fwk-vertical-navigation-mode-over'                      : this.mode === 'over',
            'fwk-vertical-navigation-mode-side'                      : this.mode === 'side',
            'fwk-vertical-navigation-opened'                         : this.opened,
            'fwk-vertical-navigation-position-left'                  : this.position === 'left',
            'fwk-vertical-navigation-position-right'                 : this.position === 'right',
        };
        /* eslint-enable @typescript-eslint/naming-convention */
    }

    /**
     * Host binding for component inline styles
     */
    @HostBinding('style') get styleList(): any
    {
        return {
            'visibility': this.opened ? 'visible' : 'hidden',
        };
    }

    /**
     * Setter for FwkScrollbarDirectives
     */
    @ViewChildren(FwkScrollbarDirective)
    set FwkScrollbarDirectives(FwkScrollbarDirectives: QueryList<FwkScrollbarDirective>)
    {
        this._FwkScrollbarDirectives = FwkScrollbarDirectives;

        if ( FwkScrollbarDirectives.length === 0 )
        {
            return;
        }

        if ( this._FwkScrollbarDirectivesSubscription )
        {
            this._FwkScrollbarDirectivesSubscription.unsubscribe();
        }

        this._FwkScrollbarDirectivesSubscription =
            merge(
                this.onCollapsableItemCollapsed,
                this.onCollapsableItemExpanded,
            )
                .pipe(
                    takeUntil(this._unsubscribeAll),
                    delay(250),
                )
                .subscribe(() =>
                {
                    FwkScrollbarDirectives.forEach((FwkScrollbarDirective) =>
                    {
                        FwkScrollbarDirective.update();
                    });
                });
    }


    /**
     * On mouseenter
     *
     * @private
     */
    @HostListener('mouseenter')
    private _onMouseenter(): void
    {
        this._enableAnimations();

        this._hovered = true;
    }

    /**
     * On mouseleave
     *
     * @private
     */
    @HostListener('mouseleave')
    private _onMouseleave(): void
    {
        this._enableAnimations();

        this._hovered = false;
    }


    /**
     * On changes
     *
     * @param changes
     */
    ngOnChanges(changes: SimpleChanges): void
    {
        if ( 'appearance' in changes )
        {
            this.appearanceChanged.next(changes.appearance.currentValue);
        }

        if ( 'inner' in changes )
        {
            this.inner = coerceBooleanProperty(changes.inner.currentValue);
        }

        if ( 'mode' in changes )
        {
            const currentMode = changes.mode.currentValue;
            const previousMode = changes.mode.previousValue;

            this._disableAnimations();

            if ( previousMode === 'over' && currentMode === 'side' )
            {
                this._hideOverlay();
            }

            if ( previousMode === 'side' && currentMode === 'over' )
            {
                this.closeAside();

                if ( this.opened )
                {
                    this._showOverlay();
                }
            }

            this.modeChanged.next(currentMode);

            setTimeout(() =>
            {
                this._enableAnimations();
            }, 500);
        }

        if ( 'navigation' in changes )
        {
            this._changeDetectorRef.markForCheck();
        }

        if ( 'opened' in changes )
        {
            this.opened = coerceBooleanProperty(changes.opened.currentValue);

            this._toggleOpened(this.opened);
        }

        if ( 'position' in changes )
        {
            this.positionChanged.next(changes.position.currentValue);
        }

        if ( 'transparentOverlay' in changes )
        {
            this.transparentOverlay = coerceBooleanProperty(changes.transparentOverlay.currentValue);
        }
    }

    /**
     * On init
     */
    ngOnInit(): void
    {
        if ( this.name === '' )
        {
            this.name = this._fwkUtilsService.randomId();
        }

        this._fwkNavigationService.registerComponent(this.name, this);

        this._router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                takeUntil(this._unsubscribeAll),
            )
            .subscribe(() =>
            {
                if ( this.mode === 'over' && this.opened )
                {
                    this.close();
                }

                if ( this.mode === 'side' && this.activeAsideItemId )
                {
                    this.closeAside();
                }
            });
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void
    {
        this._mutationObserver = new MutationObserver((mutations) =>
        {
            mutations.forEach((mutation) =>
            {
                const mutationTarget = mutation.target as HTMLElement;
                if ( mutation.attributeName === 'class' )
                {
                    if ( mutationTarget.classList.contains('cdk-global-scrollblock') )
                    {
                        const top = parseInt(mutationTarget.style.top, 10);
                        this._renderer2.setStyle(this._elementRef.nativeElement, 'margin-top', `${Math.abs(top)}px`);
                    }
                    else
                    {
                        this._renderer2.setStyle(this._elementRef.nativeElement, 'margin-top', null);
                    }
                }
            });
        });
        this._mutationObserver.observe(this._document.documentElement, {
            attributes     : true,
            attributeFilter: ['class'],
        });

        setTimeout(() =>
        {
            if ( !this._navigationContentEl )
            {
                return;
            }

            if ( !this._navigationContentEl.nativeElement.classList.contains('ps') )
            {
                const activeItem = this._navigationContentEl.nativeElement.querySelector('.fwk-vertical-navigation-item-active');

                if ( activeItem )
                {
                    activeItem.scrollIntoView();
                }
            }
            else
            {
                this._FwkScrollbarDirectives.forEach((FwkScrollbarDirective) =>
                {
                    if ( !FwkScrollbarDirective.isEnabled() )
                    {
                        return;
                    }

                    FwkScrollbarDirective.scrollToElement('.fwk-vertical-navigation-item-active', -120, true);
                });
            }
        });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this._mutationObserver.disconnect();

        this.close();
        this.closeAside();

        this._fwkNavigationService.deregisterComponent(this.name);

        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }


    /**
     * Refresh the component to apply the changes
     */
    refresh(): void
    {
        this._changeDetectorRef.markForCheck();

        this.onRefreshed.next(true);
    }

    /**
     * Open the navigation
     */
    open(): void
    {
        if ( this.opened )
        {
            return;
        }

        this._toggleOpened(true);
    }

    /**
     * Close the navigation
     */
    close(): void
    {
        if ( !this.opened )
        {
            return;
        }

        this.closeAside();

        this._toggleOpened(false);
    }

    /**
     * Toggle the navigation
     */
    toggle(): void
    {
        if ( this.opened )
        {
            this.close();
        }
        else
        {
            this.open();
        }
    }

    /**
     * Open the aside
     *
     * @param item
     */
    openAside(item: FwkNavigationItem): void
    {
        if ( item.disabled || !item.id )
        {
            return;
        }

        this.activeAsideItemId = item.id;

        this._showAsideOverlay();

        this._changeDetectorRef.markForCheck();
    }

    /**
     * Close the aside
     */
    closeAside(): void
    {
        this.activeAsideItemId = null;

        this._hideAsideOverlay();

        this._changeDetectorRef.markForCheck();
    }

    /**
     * Toggle the aside
     *
     * @param item
     */
    toggleAside(item: FwkNavigationItem): void
    {
        if ( this.activeAsideItemId === item.id )
        {
            this.closeAside();
        }
        else
        {
            this.openAside(item);
        }
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }


    /**
     * Enable the animations
     *
     * @private
     */
    private _enableAnimations(): void
    {
        if ( this._animationsEnabled )
        {
            return;
        }

        this._animationsEnabled = true;
    }

    /**
     * Disable the animations
     *
     * @private
     */
    private _disableAnimations(): void
    {
        if ( !this._animationsEnabled )
        {
            return;
        }

        this._animationsEnabled = false;
    }

    /**
     * Show the overlay
     *
     * @private
     */
    private _showOverlay(): void
    {
        if ( this._asideOverlay )
        {
            return;
        }

        this._overlay = this._renderer2.createElement('div');

        this._overlay.classList.add('fwk-vertical-navigation-overlay backdrop-blur-sm');

        if ( this.transparentOverlay )
        {
            this._overlay.classList.add('fwk-vertical-navigation-overlay-transparent');
        }

        this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._overlay);

        this._scrollStrategy.enable();

        this._player = this._animationBuilder.build([
            animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 1})),
        ]).create(this._overlay);

        this._player.play();

        this._overlay.addEventListener('click', this._handleOverlayClick);
    }

    /**
     * Hide the overlay
     *
     * @private
     */
    private _hideOverlay(): void
    {
        if ( !this._overlay )
        {
            return;
        }

        this._player = this._animationBuilder.build([
            animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 0})),
        ]).create(this._overlay);

        this._player.play();

        this._player.onDone(() =>
        {
            if ( this._overlay )
            {
                this._overlay.removeEventListener('click', this._handleOverlayClick);

                this._overlay.parentNode.removeChild(this._overlay);
                this._overlay = null;
            }

            this._scrollStrategy.disable();
        });
    }

    /**
     * Show the aside overlay
     *
     * @private
     */
    private _showAsideOverlay(): void
    {
        if ( this._asideOverlay )
        {
            return;
        }

        this._asideOverlay = this._renderer2.createElement('div');

        this._asideOverlay.classList.add('fwk-vertical-navigation-aside-overlay');

        this._renderer2.appendChild(this._elementRef.nativeElement.parentElement, this._asideOverlay);

        this._player =
            this._animationBuilder
                .build([
                    animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 1})),
                ]).create(this._asideOverlay);

        this._player.play();

        this._asideOverlay.addEventListener('click', this._handleAsideOverlayClick);
    }

    /**
     * Hide the aside overlay
     *
     * @private
     */
    private _hideAsideOverlay(): void
    {
        if ( !this._asideOverlay )
        {
            return;
        }

        this._player =
            this._animationBuilder
                .build([
                    animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({opacity: 0})),
                ]).create(this._asideOverlay);

        this._player.play();

        this._player.onDone(() =>
        {
            if ( this._asideOverlay )
            {
                this._asideOverlay.removeEventListener('click', this._handleAsideOverlayClick);

                this._asideOverlay.parentNode.removeChild(this._asideOverlay);
                this._asideOverlay = null;
            }
        });
    }

    /**
     * Open/close the navigation
     *
     * @param open
     * @private
     */
    private _toggleOpened(open: boolean): void
    {
        this.opened = open;

        this._enableAnimations();

        if ( this.mode === 'over' )
        {
            if ( this.opened )
            {
                this._showOverlay();
            }
            else
            {
                this._hideOverlay();
            }
        }

        this.openedChanged.next(open);
    }
}
