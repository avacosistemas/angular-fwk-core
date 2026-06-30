// FWK Core — Public API
// Import everything from subdirectory barrels

// Layout (Fuse fork — dense, empty, navigation, alert, loading, etc.)
export * from './layout/index';

// Auth (services, guards, components, provider)
export * from './auth/index';
export { User } from './auth/user.types';

// Navigation (dynamic nav, breadcrumb, provider)
export * from './navigation/index';

// Models (interfaces, types, config)
export * from './model/index';

// Services (HTTP, i18n, CRUD, notifications, etc.)
export * from './services/index';

// Pipes
export * from './pipe/index';

// Providers
export * from './providers/index';

// Components (CRUD, forms, dashboard, modals, etc.)
export * from './components/index';

// Directive
export * from './directive/restriction-keys.directive';

// i18n (global dictionary)
export * from './i18n/fwk.i18n';

// Utils
export * from './utils/constants';
export * from './utils/crud-route-generator';

// Modules (only DevTools service, not the components)
export * from './modules/spinner/service/spinner.service';
export * from './modules/spinner/service/spinner.interface';
export * from './modules/spinner/component/spinner.component';
export * from './modules/error/error-403/error-403.component';
export * from './modules/error/error-404/error-404.component';
