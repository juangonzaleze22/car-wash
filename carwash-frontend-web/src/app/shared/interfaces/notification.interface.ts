export interface Notification {
    id: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
    read: boolean;
    createdAt: Date;
    orderId?: number;
    deliveryRequestId?: string;
    role?: string;
    order?: {
        id: number;
        uuid: string;
        vehicle: {
            plate: string;
        };
    };
}

import { Observable } from 'rxjs';

export interface NotificationServiceInterface {
    notifications: () => Notification[];
    unreadCount: () => number;
    markAsRead: (id: string) => void | Observable<any>;
    clearAll: () => void;
    loadNotifications?: () => Observable<Notification[]>;
}

// Type guard para verificar si un servicio tiene loadNotifications
export function hasLoadNotifications(service: NotificationServiceInterface): service is NotificationServiceInterface & { loadNotifications: () => Observable<Notification[]> } {
    return typeof service.loadNotifications === 'function';
}

