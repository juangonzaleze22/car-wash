import { Component, inject, OnInit } from '@angular/core';
import { ClientNotificationService } from '../../../core/services/client-notification.service';
import { NotificationBaseComponent } from '../notification-base/notification-base.component';

@Component({
  selector: 'app-client-notification',
  standalone: true,
  imports: [
    NotificationBaseComponent
  ],
  template: `
    <app-notification-base [notificationService]="notificationService" [loadOnInit]="true"></app-notification-base>
  `
})
export class ClientNotificationComponent implements OnInit {
  notificationService = inject(ClientNotificationService);

  ngOnInit() {
    // Cargar notificaciones al inicializar
    this.notificationService.loadNotifications().subscribe();
  }
}

