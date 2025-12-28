import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClientAuthService } from './client-auth.service';

export interface ClientDashboard {
    client: {
        id: string;
        name: string;
        phone: string;
        type: string;
    };
    pendingOrders: Array<{
        id: number;
        uuid: string;
        plate: string;
        status: string;
        totalAmount: number;
        createdAt: string;
        startedAt?: string;
        elapsedMinutes: number;
        washers: Array<{
            id: string;
            name: string;
            username: string;
        }>;
        services: Array<{
            name: string;
            price: number;
            assignedWasher: {
                id: string;
                name: string;
                username: string;
            } | null;
        }>;
    }>;
    history: Array<{
        id: number;
        uuid: string;
        plate: string;
        vehicleId: string;
        status: string;
        totalAmount: number;
        createdAt: string;
        completedAt?: string;
        services: Array<{
            name: string;
            price: number;
        }>;
    }>;
    kpis: {
        totalOrders: number;
        totalSpent: number;
        averageOrderValue: number;
    };
    vehicles: Array<{
        id: string;
        plate: string;
        category: string;
        categoryRef: {
            name: string;
            code: string;
        } | null;
        notes?: string;
        totalOrders: number;
    }>;
}

export interface OrderDetails {
    id: number;
    uuid: string;
    plate: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    duration?: number;
    services: Array<{
        id: string;
        name: string;
        price: number;
        commissionAmount: number;
        assignedWasher: {
            name: string;
            username: string;
        } | null;
    }>;
    payments: Array<{
        amount: number;
        currency: string;
        method: string;
        exchangeRate?: number;
        amountUSD?: number;
        reference?: string;
        createdAt: string;
        cashier: {
            username: string;
        } | null;
    }>;
    supervisor: {
        name: string;
        username: string;
    } | null;
}

@Injectable({
    providedIn: 'root'
})
export class ClientDashboardService {
    private http = inject(HttpClient);
    private clientAuthService = inject(ClientAuthService);
    private apiUrl = 'http://localhost:3000/api/client';

    private getHeaders(): HttpHeaders {
        const token = this.clientAuthService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    getDashboard(): Observable<ClientDashboard> {
        return this.http.get<ClientDashboard>(`${this.apiUrl}/dashboard`, {
            headers: this.getHeaders()
        });
    }

    getOrderDetails(orderId: number): Observable<OrderDetails> {
        return this.http.get<OrderDetails>(`${this.apiUrl}/orders/${orderId}`, {
            headers: this.getHeaders()
        });
    }
}

