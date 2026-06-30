import { Directive, Injector, OnInit } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';

import { AbstractComponent } from './abstract-component.component';
import { FormService } from '../services/dynamic-form/form.service';
import { WsDef } from '../model/ws-def';
import { GenericHttpService } from '../services/generic-http-service/generic-http.service';
import { SpinnerService } from '../modules/spinner/service/spinner.service';

export const VALIDATIONS_ERRORS = 'VALIDATIONS_ERRORS';

@Directive()
export abstract class AbstractFormComponent extends AbstractComponent implements OnInit {

    protected formService: FormService;
    protected genericHttpService: GenericHttpService;
    protected spinnerService: SpinnerService;
    protected spinnerControl: any;
    private requestCount = 0;

    constructor(injector: Injector) {
        super(injector);
        this.formService = injector.get(FormService);
        this.genericHttpService = injector.get(GenericHttpService);
        this.spinnerService = injector.get(SpinnerService);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.spinnerControl = this.spinnerService.getControlGlobalSpinner();
    }

    private showSpinner(): void {
        this.requestCount++;
        if (this.requestCount === 1 && this.spinnerControl) {
            setTimeout(() => this.spinnerControl.show(), 0);
        }
    }

    private hideSpinner(): void {
        this.requestCount--;
        if (this.requestCount === 0 && this.spinnerControl) {
            setTimeout(() => this.spinnerControl.hide(), 0);
        }
    }

    private handleFormError(error: any, form: any): Observable<never> {
        if (error?.error?.status === VALIDATIONS_ERRORS) {
            this.formService.addErrorToFields(form, error.error.errors);
        }
        return throwError(() => error);
    }

    genericSubmitWithWsDef(ws: WsDef, entity: any, form: any): Observable<any> {
        this.showSpinner();
        return this.genericHttpService.callWs(ws, entity).pipe(
            catchError(e => this.handleFormError(e, form)),
            finalize(() => this.hideSpinner())
        );
    }

    genericSubmit(service: { [key: string]: (entity: any) => Observable<any> }, wsMethod: string, entity: any, form: any): Observable<any> {
        if (!service || typeof service[wsMethod] !== 'function') {
            const error = `El método '${wsMethod}' no existe en el servicio proporcionado.`;
            console.error(`[FWK] ${error}`);
            return throwError(() => new Error(error));
        }

        this.showSpinner();
        return service[wsMethod](entity).pipe(
            catchError(e => this.handleFormError(e, form)),
            finalize(() => this.hideSpinner())
        );
    }

    submitFormStepper(service: { [key: string]: (entity: any) => Observable<any> }, method: string, entity: any, form: any, stepper: MatStepper): Observable<any> {
        return this.genericSubmit(service, method, entity, form).pipe(
            tap(() => {
                stepper.next();
            })
        );
    }

    setUpTextFromI18n(fields: any[]): void {
        if (this.i18n) {
            this.formService.setUpFieldTextFromI18n(this.i18n, fields);
        }
    }

    get submitting(): boolean {
        return this.requestCount > 0;
    }
}