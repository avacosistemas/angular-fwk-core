import { OnInit, Component, Injector, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { AbstractComponent } from '../../../components/abstract-component.component';
import { SpinnerService } from '../service/spinner.service';
import { SpinnerControlApi } from '../service/spinner.interface';

@Component({
   selector: 'fwk-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule]
})
export class SpinnerComponent extends AbstractComponent implements OnInit, OnDestroy {

  @Input()
  spinnerKey!: string;

  show: boolean = false;
  
  private spinnerService: SpinnerService;
  private controlSpinner!: SpinnerControlApi;
  private destroy$ = new Subject<void>();

  constructor(private injector: Injector) {
    super(injector);
    this.spinnerService = injector.get(SpinnerService);
  }

  override ngOnInit(): void {
    if (!this.spinnerKey) {
        console.error('SpinnerComponent requiere un [spinnerKey].');
        return;
    }
    
    this.controlSpinner = this.spinnerService.addSpinner(this.spinnerKey);

    this.controlSpinner.state$
        .pipe(takeUntil(this.destroy$))
        .subscribe(state => {
            this.show = state.show;
        });
  }

  override ngOnDestroy(): void {
      super.ngOnDestroy();
      this.destroy$.next();
      this.destroy$.complete();
  }
}