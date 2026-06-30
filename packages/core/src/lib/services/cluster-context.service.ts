import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClusterContextService {
    private _isClusterActive = false;

    setClusterActive(active: boolean): void {
        this._isClusterActive = active;
    }

    get isActive(): boolean {
        return this._isClusterActive;
    }
}
