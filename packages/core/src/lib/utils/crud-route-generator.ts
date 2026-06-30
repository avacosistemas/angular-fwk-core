import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { CrudRegistryService } from '../services/crud-registry.service';
import { I18nService } from '../services/i18n-service/i18n.service';
import { PageComponentDef } from '../model/component-def/page-component-def';
import { CrudDef } from '../model/component-def/crud-def';

export function normalizeCrudName(name: string): string {
    return name.replace(/-|_/g, '').toUpperCase();
}

function createDefResolver(loader: () => Promise<any>): ResolveFn<CrudDef | PageComponentDef | null> {
    return () => {
        const registry = inject(CrudRegistryService);
        const i18nService = inject(I18nService);

        return loader().then(module => {
            const defKey = Object.keys(module).find(key => key.endsWith('_DEF'));
            if (!defKey) {
                console.error('No se encontró una exportación "_DEF" en el módulo cargado.', module);
                return null;
            }

            const definition = module[defKey];
            const componentName = normalizeCrudName(definition.name);

            if (definition.i18n) {
                i18nService.addI18n(definition.i18n);
            }

            registry.register(componentName, () => Promise.resolve(definition));

            return definition;
        });
    };
}

export function generateFwkPageRoutes(loader: () => Promise<any>): Routes {
    return [
        {
            path: '',
            resolve: {
                definition: createDefResolver(loader)
            },
            loadComponent: () => {
                return loader().then(module => {
                    const defKey = Object.keys(module).find(key => key.endsWith('_DEF'));
                    const definition = defKey ? module[defKey] : null;

                    if (definition && (definition as PageComponentDef).component) {
                        return import('../components/page-component-wrapper/page-component-wrapper.component')
                            .then(m => m.PageComponentWrapperComponent);
                    }

                    if (definition && definition.dashboardConfig) {
                        return import('../components/dashboard-wrapper/dashboard-wrapper.component')
                            .then(m => m.DashboardWrapperComponent);
                    } else {
                        return import('../components/legacy-crud-wrapper/legacy-crud-wrapper.component')
                            .then(m => m.LegacyCrudWrapperComponent);
                    }
                });
            }
        }
    ];
}