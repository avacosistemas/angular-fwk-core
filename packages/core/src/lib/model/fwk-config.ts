import { InjectionToken } from '@angular/core';
import { Route } from '@angular/router';

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
    signInSubtitle?: string;
}

export interface SidebarConfig {
    opened: boolean;
    collapseIcon: boolean;
}

export interface SearchConfig {
    showButton: boolean;
}

export interface RoutingConfig {
    redirectOnLogout: string;
    defaultRedirect: string | null;
    welcomeDashboard: boolean;
}

export interface FwkConfig {
    brand: BrandConfig;
    welcome: WelcomeConfig;
    sidebar: SidebarConfig;
    search: SearchConfig;
    routing: RoutingConfig;

    appId?: string;
    apiBaseUrl?: string;
    siteInstitucionalUrl?: string;
    production?: boolean;
    security?: boolean;
    dummyServices?: boolean;
    hmr?: boolean;
    autocompleteWaitingTime?: number;
    customRoutes?: Route[];

    auth?: {
        signIn?: string;
        signOut?: string;
        refreshToken?: string;
        forgotPassword?: string;
        resetPassword?: string;
        changePassword?: string | null;
        signUp?: string;
    };
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
