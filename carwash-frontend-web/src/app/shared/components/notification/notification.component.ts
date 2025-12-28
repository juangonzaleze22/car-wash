import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationBaseComponent } from '../notification-base/notification-base.component';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [
    NotificationBaseComponent
  ],
  template: `
    <app-notification-base [notificationService]="notificationService" [loadOnInit]="true"></app-notification-base>
  `
})
export class NotificationComponent {
  notificationService = inject(NotificationService);
}
