import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SpinnerControlApi, SpinnerControlState } from './spinner.interface';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
  private spinnerMap: Map<string, { subject: BehaviorSubject<SpinnerControlState>, api: SpinnerControlApi }> = new Map();

  constructor() { }

  /**
   * @param spinnerKey L
   */
  addSpinner(spinnerKey: string): SpinnerControlApi {
    if (!this.spinnerMap.has(spinnerKey)) {
      this.spinnerMap.set(spinnerKey, this.createControl(spinnerKey));
    }
    return this.getControlSpinner(spinnerKey)!;
  }

  /**
   * @param spinnerKey L
   */
  getControlSpinner(spinnerKey: string): SpinnerControlApi | undefined {
    return this.spinnerMap.get(spinnerKey)?.api;
  }

  getControlGlobalSpinner(): SpinnerControlApi {
    return this.addSpinner('global');
  }

  /**
   * @param spinnerKey 
   */
  private createControl(spinnerKey: string): { subject: BehaviorSubject<SpinnerControlState>, api: SpinnerControlApi } {
    const initialState: SpinnerControlState = {
      key: spinnerKey,
      show: false,
    };

    const subject = new BehaviorSubject<SpinnerControlState>(initialState);

    const api: SpinnerControlApi = {
      key: spinnerKey,
      state$: subject.asObservable(),

      show(): void {
        const currentState = subject.getValue();
        if (!currentState.show) {
          subject.next({ ...currentState, show: true });
        }
      },

      hide(): void {
        const currentState = subject.getValue();
        if (currentState.show) {
          subject.next({ ...currentState, show: false });
        }
      },

      isShow(): boolean {
        return subject.getValue().show;
      },

      getState(): SpinnerControlState {
        return subject.getValue();
      }
    };

    return { subject, api };
  }
}