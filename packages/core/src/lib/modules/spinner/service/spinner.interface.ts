import { Observable } from 'rxjs';

export interface SpinnerControlState {
    key: string;
    show: boolean;
}

export interface SpinnerControlApi {
    key: string;
    state$: Observable<SpinnerControlState>;
    show(): void;
    hide(): void;
    isShow(): boolean;
    getState(): SpinnerControlState;
}