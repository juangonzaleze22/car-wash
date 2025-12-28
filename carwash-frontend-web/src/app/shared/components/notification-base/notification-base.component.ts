import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { Observable } from 'rxjs';
import { NotificationServiceInterface, hasLoadNotifications, Notification } from '../../interfaces/notification.interface';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-notification-base',
  standalone: true,
  imports: [
    CommonModule,
    OverlayPanelModule,
    ButtonModule,
    BadgeModule,
    ScrollPanelModule
  ],
  templateUrl: './notification-base.component.html',
  styleUrls: ['./notification-base.component.css']
})
export class NotificationBaseComponent implements OnInit {
  @Input() notificationService!: NotificationServiceInterface;
  @Input() loadOnInit: boolean = false;

  ngOnInit() {
    if (this.loadOnInit && hasLoadNotifications(this.notificationService)) {
      this.notificationService.loadNotifications().subscribe();
    }
  }

  private router = inject(Router);
  private authService = inject(AuthService);

  onNotificationClick(item: Notification, overlayPanel: any) {
    // Marcar como leída
    if (!item.read) {
      const result = this.notificationService.markAsRead(item.id);
      if (result instanceof Observable) {
        result.subscribe();
      }
    }

    // Redirigir si es una solicitud de delivery
    if (item.deliveryRequestId) {
      const role = this.authService.currentUser()?.role;
      if (role === 'ADMIN') {
        this.router.navigate(['/admin/requests']);
      } else if (role === 'SUPERVISOR') {
        this.router.navigate(['/supervisor/requests']);
      }
      overlayPanel.hide();
    }
  }

  onMarkAsRead(id: string) {
    const result = this.notificationService.markAsRead(id);
    if (result instanceof Observable) {
      result.subscribe();
    }
  }
}

