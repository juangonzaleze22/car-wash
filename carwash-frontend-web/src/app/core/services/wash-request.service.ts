import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DeliveryRequest {
    id: string;
    clientId: string;
    vehicleId: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    address: string;
    latitude: number;
    longitude: number;
    services: any[]; // {serviceId, name, price}
    deliveryFee: number;
    totalAmount: number;
    notes?: string;
    cancellationReason?: string;
    createdAt: string;
    updatedAt: string;
    client?: any;
    vehicle?: any;
}

export interface CreateDeliveryRequestDto {
    vehicleId: string;
    address: string;
    latitude: number;
    longitude: number;
    services: { serviceId: string, name: string, price: number }[];
    totalAmount: number;
    notes?: string;
}

@Injectable({
    providedIn: 'root'
})
export class WashRequestService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/delivery-requests';

    createRequest(data: CreateDeliveryRequestDto): Observable<DeliveryRequest> {
        return this.http.post<DeliveryRequest>(this.apiUrl, data);
    }

    getMyRequests(): Observable<DeliveryRequest[]> {
        return this.http.get<DeliveryRequest[]>(`${this.apiUrl}/my`);
    }

    getPendingRequests(): Observable<DeliveryRequest[]> {
        return this.http.get<DeliveryRequest[]>(`${this.apiUrl}/pending`);
    }

    getRequestById(id: string): Observable<DeliveryRequest> {
        return this.http.get<DeliveryRequest>(`${this.apiUrl}/${id}`);
    }

    updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED', cancellationReason?: string): Observable<DeliveryRequest> {
        return this.http.patch<DeliveryRequest>(`${this.apiUrl}/${id}/status`, { status, cancellationReason });
    }
}
