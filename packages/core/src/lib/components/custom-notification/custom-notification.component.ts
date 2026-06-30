import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface NotificationData {
    message: string;
    type: 'success' | 'error' | 'info';
}

@Component({
     selector: 'fwk-custom-notification',
    templateUrl: './custom-notification.component.html',
    styleUrls: ['./custom-notification.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NgClass,
        MatButtonModule,
        MatIconModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomNotificationComponent {
    public data: NotificationData = inject(MAT_SNACK_BAR_DATA);
    public snackBarRef = inject(MatSnackBarRef<CustomNotificationComponent>);

    get icon(): string {
        switch (this.data.type) {
            case 'success':
                return 'heroicons_solid:check-circle';
            case 'error':
                return 'heroicons_solid:x-circle';
            case 'info':
            default:
                return 'heroicons_solid:information-circle';
        }
    }

    dismiss(): void {
        this.snackBarRef.dismiss();
    }
}