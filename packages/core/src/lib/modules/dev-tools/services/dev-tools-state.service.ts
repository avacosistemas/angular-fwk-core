import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface OverlayState {
    show: boolean;
    message: string;
}

@Injectable({ providedIn: 'root' })
export class DevToolsStateService {
    private _overlayState = new BehaviorSubject<OverlayState>({ show: false, message: '' });

    public readonly overlayState$: Observable<OverlayState> = this._overlayState.asObservable();

    show(message: string): void {
        this._overlayState.next({ show: true, message });
    }

    hide(): void {
        this._overlayState.next({ show: false, message: '' });
    }
}