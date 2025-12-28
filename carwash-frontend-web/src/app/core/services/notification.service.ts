import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';
import { Notification } from '../../shared/interfaces/notification.interface';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private wsService = inject(WebSocketService);
    private authService = inject(AuthService);

    notifications = signal<Notification[]>([]);
    unreadCount = signal<number>(0);

    constructor() {
        this.initSocketListener();
    }

    loadNotifications(): Observable<Notification[]> {
        return this.http.get<Notification[]>('http://localhost:3000/api/notifications').pipe(
            tap(notifications => {
                this.notifications.set(notifications);
                this.updateUnreadCount();
            })
        );
    }

    private initSocketListener() {
        this.wsService.listen<Notification>('notifications:new').subscribe((notification: Notification) => {
            const currentUser = this.authService.currentUser();

            // Filter by role (if notification has a role and user role doesn't match)
            if (notification.role && currentUser && notification.role !== currentUser.role) {
                return;
            }

            // Evitar duplicados si ya existe
            if (this.notifications().some(n => n.id === notification.id)) {
                return;
            }

            // Add to list
            this.addNotification(notification);
        });
    }

    addNotification(notification: Notification) {
        this.notifications.update(current => [notification, ...current]);
        this.updateUnreadCount();
    }

    markAsRead(id: string): Observable<any> {
        return this.http.patch(`http://localhost:3000/api/notifications/${id}/read`, {}).pipe(
            tap(() => {
                this.notifications.update(current =>
                    current.map(n => n.id === id ? { ...n, read: true } : n)
                );
                this.updateUnreadCount();
            })
        );
    }

    clearAll() {
        this.notifications.set([]);
        this.updateUnreadCount();
    }

    private updateUnreadCount() {
        this.unreadCount.set(this.notifications().filter(n => !n.read).length);
    }
}
