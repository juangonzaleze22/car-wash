import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ClientAuthService } from './client-auth.service';
import { WebSocketService } from './websocket.service';
import { Notification } from '../../shared/interfaces/notification.interface';

@Injectable({
    providedIn: 'root'
})
export class ClientNotificationService {
    private http = inject(HttpClient);
    private clientAuthService = inject(ClientAuthService);
    private wsService = inject(WebSocketService);
    private apiUrl = 'http://localhost:3000/api/client';

    notifications = signal<Notification[]>([]);
    unreadCount = signal<number>(0);

    constructor() {
        this.initSocketListener();
        // Cargar notificaciones solo si hay token (cliente autenticado)
        const token = this.clientAuthService.getToken();
        if (token) {
            this.loadNotifications().subscribe();
        }
    }

    private getHeaders(): HttpHeaders {
        const token = this.clientAuthService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    private initSocketListener() {
        this.wsService.listen<any>('notifications:new').subscribe((notification: any) => {
            // Solo procesar notificaciones sin rol (para clientes)
            // Ignorar notificaciones con rol (para empleados)
            if (notification.role) {
                return; // Ignorar notificaciones de empleados
            }

            // Verificar si la notificación ya existe para evitar duplicados
            const existingNotification = this.notifications().find(n => n.id === notification.id);
            if (existingNotification) {
                return; // Ya existe, no agregar duplicado
            }

            // Agregar la notificación directamente
            this.addNotification(notification);

            // Si tiene orderId, también recargar del servidor para sincronizar y obtener la lista completa
            // Esto asegura que si hay múltiples eventos, se obtenga el estado correcto del servidor
            if (notification.orderId) {
                setTimeout(() => {
                    this.loadNotifications().subscribe();
                }, 300);
            }
        });
    }

    loadNotifications(): Observable<Notification[]> {
        return this.http.get<Notification[]>(`${this.apiUrl}/notifications`, {
            headers: this.getHeaders()
        }).pipe(
            tap(notifications => {
                this.notifications.set(notifications);
                this.updateUnreadCount();
            })
        );
    }

    markAsRead(id: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/notifications/${id}/read`, {}, {
            headers: this.getHeaders()
        }).pipe(
            tap(() => {
                this.notifications.update(current =>
                    current.map(n => n.id === id ? { ...n, read: true } : n)
                );
                this.updateUnreadCount();
            })
        );
    }

    addNotification(notification: Notification) {
        this.notifications.update(current => [notification, ...current]);
        this.updateUnreadCount();
    }

    clearAll() {
        this.notifications.set([]);
        this.updateUnreadCount();
    }

    private updateUnreadCount() {
        this.unreadCount.set(this.notifications().filter(n => !n.read).length);
    }
}

