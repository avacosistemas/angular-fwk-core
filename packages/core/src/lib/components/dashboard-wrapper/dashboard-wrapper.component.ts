import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CrudRegistryService } from '../../services/crud-registry.service';
import { CrudDef } from '../../model/component-def/crud-def';
import { DashboardLayoutDef } from '../../model/component-def/dashboard-def';
import { DashboardPageComponent } from '../dashboard/dashboard-page/dashboard-page.component';
import { normalizeCrudName } from '../../utils/crud-route-generator';

@Component({
  selector: 'fwk-dashboard-wrapper',
  template: `
    <fwk-dashboard-page *ngIf="dashboardLayout" [layoutDef]="dashboardLayout" [i18nName]="i18nName" class="w-full"></fwk-dashboard-page>
  `,
  standalone: true,
  imports: [CommonModule, DashboardPageComponent],
})
export class DashboardWrapperComponent implements OnInit {
  dashboardLayout: DashboardLayoutDef | null = null;
  i18nName: string = 'fwk';

  private route = inject(ActivatedRoute);
  private registry = inject(CrudRegistryService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const nameFromPath = this.route.snapshot.parent?.routeConfig?.path;
    if (nameFromPath) {
      const componentName = normalizeCrudName(nameFromPath);
      
      this.registry.get(componentName).then(def => {
          const crudDef = def as CrudDef;
          if (crudDef.dashboardConfig) {
              this.dashboardLayout = crudDef.dashboardConfig;
              this.i18nName = crudDef.i18n.name;
              this.cdr.markForCheck();
          } else {
              console.error(`[DashboardWrapper] No se encontró 'dashboardConfig' en la definición para ${componentName}`);
          }
      }).catch(err => {
        console.error(`[DashboardWrapper] Error al cargar la definición para ${componentName}:`, err);
      });
    } else {
        console.warn('[DashboardWrapper] No se pudo determinar el nombre del dashboard desde la ruta.');
    }
  }
}