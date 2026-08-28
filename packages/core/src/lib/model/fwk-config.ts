import { InjectionToken, Type } from '@angular/core';
import { Route } from '@angular/router';

export const FWK_SIDEBAR_CUSTOM_TOP_COMPONENT = new InjectionToken<Type<any>>('FWK_SIDEBAR_CUSTOM_TOP_COMPONENT');
export const FWK_SIDEBAR_CUSTOM_FOOTER_COMPONENT = new InjectionToken<Type<any>>('FWK_SIDEBAR_CUSTOM_FOOTER_COMPONENT');
export const FWK_TOPBAR_CUSTOM_COMPONENT = new InjectionToken<Type<any>>('FWK_TOPBAR_CUSTOM_COMPONENT');
export const FWK_MAIN_FOOTER_CUSTOM_COMPONENT = new InjectionToken<Type<any>>('FWK_MAIN_FOOTER_CUSTOM_COMPONENT');
export const FWK_USER_MENU_CUSTOM_COMPONENT = new InjectionToken<Type<any>>('FWK_USER_MENU_CUSTOM_COMPONENT');
export const FWK_AUTH_FORM_FOOTER_CUSTOM_COMPONENT = new InjectionToken<Type<any>>('FWK_AUTH_FORM_FOOTER_CUSTOM_COMPONENT');

export interface AuthSideBackgroundConfig {
    imageUrl?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    overlayOpacity?: number;
    titleColor?: string;
    subtitleColor?: string;
}

export interface AuthLinkOption {
    show?: boolean;
    url?: string;
    target?: string;
    isExternal?: boolean;
}

export interface AuthConfig {
    signIn?: string;
    signOut?: string;
    refreshToken?: string;
    forgotPassword?: string;
    resetPassword?: string;
    changePassword?: string | null;
    signUp?: string;
    sideBackground?: AuthSideBackgroundConfig;
    recaptchaSiteKey?: string;
    links?: {
        forgotPassword?: AuthLinkOption;
        signUp?: AuthLinkOption;
    };
}

export interface BrandLogoStyle {
    showName: boolean;
    containerClass: string;
    imgClass: string;
    nameClass: string;
}

export interface BrandLogoUrls {
    auth: string;
    sidebar: string;
}

export interface BrandConfig {
    name: string;
    logo: BrandLogoUrls;
    isologo: string;
    style: {
        auth: BrandLogoStyle;
        sidebar: BrandLogoStyle;
    };
}

export interface WelcomeConfig {
    titleLine1: string;
    titleLine2: string;
    signInSubtitle?: string | null;
}

export interface SidebarConfig {
    opened: boolean;
    collapseIcon: boolean;
    customTopComponent?: Type<any>;
    customFooterComponent?: Type<any>;
}

export interface SearchConfig {
    showButton: boolean;
}

export interface RoutingConfig {
    redirectOnLogout: string;
    defaultRedirect: string | null;
    welcomeDashboard: boolean;
}

export interface AppColorPalette {
    default: string;
    card: string;
    dialog: string;
    hover: string;
}

export interface AppTextColorPalette {
    default: string;
    secondary: string;
    hint: string;
    disabled: string;
}

export interface AppColors {
    primary: string;
    accent: string;
    warn: string;
    bg: AppColorPalette;
    text: AppTextColorPalette;
    border: string;
    divider: string;
    icon: string;
    dark?: {
        bg: AppColorPalette;
        text: AppTextColorPalette;
        border: string;
        divider: string;
        icon: string;
    };
}

export interface FwkConfig {
    brand: BrandConfig;
    welcome: WelcomeConfig;
    sidebar: SidebarConfig;
    search: SearchConfig;
    routing: RoutingConfig;
    colors?: AppColors;

    customTopbarComponent?: Type<any>;
    customMainFooterComponent?: Type<any>;
    customUserMenuComponent?: Type<any>;
    customAuthFormFooterComponent?: Type<any>;

    appId?: string;
    apiBaseUrl?: string;
    siteInstitucionalUrl?: string;
    production?: boolean;
    security?: boolean;
    dummyServices?: boolean;
    hmr?: boolean;
    autocompleteWaitingTime?: number;
    recaptchaSiteKey?: string;
    customRoutes?: Route[];

    auth?: AuthConfig;
}

export const DEFAULT_fwk_CONFIG: FwkConfig = {
    brand: {
        name: 'FRAMEWORK',
        logo: {
            auth: 'assets/images/logo/logo.png',
            sidebar: 'assets/images/logo/logo.png',
        },
        isologo: 'assets/images/logo/logo.svg',
        style: {
            auth: {
                showName: true,
                containerClass: '',
                imgClass: 'h-10',
                nameClass: 'text-xl font-bold',
            },
            sidebar: {
                showName: false,
                containerClass: 'w-16',
                imgClass: 'h-10',
                nameClass: 'text-xl font-bold',
            },
        },
    },
    welcome: {
        titleLine1: 'Administrador de',
        titleLine2: 'Contenidos',
    },
    sidebar: {
        opened: true,
        collapseIcon: true,
    },
    search: {
        showButton: true,
    },
    routing: {
        redirectOnLogout: '/sign-in',
        defaultRedirect: null,
        welcomeDashboard: true,
    },
    production: false,
    security: true,
    dummyServices: false,
};

export const FWK_CONFIG = new InjectionToken<FwkConfig>('FWK_CONFIG', {
    providedIn: 'root',
    factory: () => DEFAULT_fwk_CONFIG
});
