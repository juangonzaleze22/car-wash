import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WasherEarning {
    id: string;
    orderItemId: string;
    washerId: string;
    orderId: number;
    commissionAmount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    earnedAt: string;
    paidAt?: string;
    washer?: {
        id: string;
        username: string;
    };
    order?: {
        id: number;
        uuid: string;
        vehicle?: {
            plate: string;
            client?: {
                name: string;
                phone: string;
            };
        };
    };
    orderItem?: {
        id: string;
        service?: {
            name: string;
            price: number;
        };
    };
}

export interface WasherEarningsResponse {
    earnings: WasherEarning[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface WasherEarningsSummary {
    totalEarnings: number;
    totalOrders: number;
    washersSummary: Array<{
        washerId: string;
        washerName: string;
        totalEarnings: number;
        totalOrders: number;
    }>;
}

export interface MarkAsPaidRequest {
    earningIds: string[];
    paidAt?: Date;
}

@Injectable({
    providedIn: 'root'
})
export class WasherEarningsService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/washers/earnings';

    /**
     * Obtiene las ganancias de los lavadores con filtros
     */
    getEarnings(params?: {
        washerId?: string;
        orderId?: number;
        status?: 'PENDING' | 'PAID' | 'CANCELLED';
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }): Observable<WasherEarningsResponse> {
        let httpParams = new HttpParams();
        
        if (params) {
            if (params.washerId) httpParams = httpParams.set('washerId', params.washerId);
            if (params.orderId) httpParams = httpParams.set('orderId', params.orderId.toString());
            if (params.status) httpParams = httpParams.set('status', params.status);
            if (params.startDate) httpParams = httpParams.set('startDate', params.startDate.toISOString());
            if (params.endDate) httpParams = httpParams.set('endDate', params.endDate.toISOString());
            if (params.page) httpParams = httpParams.set('page', params.page.toString());
            if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
        }

        return this.http.get<WasherEarningsResponse>(this.apiUrl, { params: httpParams });
    }

    /**
     * Obtiene el resumen de ganancias (solo admin)
     */
    getSummary(startDate?: Date, endDate?: Date): Observable<WasherEarningsSummary> {
        let httpParams = new HttpParams();
        if (startDate) httpParams = httpParams.set('startDate', startDate.toISOString());
        if (endDate) httpParams = httpParams.set('endDate', endDate.toISOString());
        
        return this.http.get<WasherEarningsSummary>(`${this.apiUrl}/summary`, { params: httpParams });
    }

    /**
     * Marca ganancias como pagadas (solo admin)
     */
    markAsPaid(request: MarkAsPaidRequest): Observable<{ message: string; count: number }> {
        return this.http.post<{ message: string; count: number }>(
            `${this.apiUrl}/mark-as-paid`,
            {
                earningIds: request.earningIds,
                paidAt: request.paidAt?.toISOString()
            }
        );
    }

    /**
     * Obtiene las ganancias del lavador autenticado
     */
    getMyEarnings(params?: {
        status?: 'PENDING' | 'PAID' | 'CANCELLED';
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }): Observable<WasherEarningsResponse> {
        let httpParams = new HttpParams();
        
        if (params) {
            if (params.status) httpParams = httpParams.set('status', params.status);
            if (params.startDate) httpParams = httpParams.set('startDate', params.startDate.toISOString());
            if (params.endDate) httpParams = httpParams.set('endDate', params.endDate.toISOString());
            if (params.page) httpParams = httpParams.set('page', params.page.toString());
            if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
        }

        return this.http.get<WasherEarningsResponse>(`${this.apiUrl}/my-earnings`, { params: httpParams });
    }
}

