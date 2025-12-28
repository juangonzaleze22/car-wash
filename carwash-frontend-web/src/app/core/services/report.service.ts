import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Report {
    period: string;
    startDate: string;
    endDate: string;
    summary: {
        totalRevenueUSD: number;
        totalRevenueVES: number;
        totalExpensesUSD?: number;
        totalWasherEarningsUSD?: number;
        netProfitUSD?: number;
        totalOrders: number;
        completedOrders: number;
        moneyToDeliverUSD: number;
        totalChangeUSD: number;
        totalChangeByMethod: {
            CASH: { USD: number; VES: number; totalUSD: number };
            CARD: { USD: number; VES: number; totalUSD: number };
            TRANSFER: { USD: number; VES: number; totalUSD: number };
        };
        moneyToDeliverByMethod: {
            CASH: { USD: number; VES: number; totalUSD: number };
            CARD: { USD: number; VES: number; totalUSD: number };
            TRANSFER: { USD: number; VES: number; totalUSD: number };
        };
    };
    paymentsByMethod: {
        CASH: { USD: number; VES: number; totalUSD: number };
        CARD: { USD: number; VES: number; totalUSD: number };
        TRANSFER: { USD: number; VES: number; totalUSD: number };
    };
    paymentsByCurrency: {
        USD: number;
        VES: number;
        totalUSD: number;
    };
    orders: Array<{
        id: number;
        uuid: string;
        plate: string;
        clientName: string;
        totalAmount: number;
        status: string;
        closedAt: string | null;
        changeAmount: number | null;
        changeCurrency: string | null;
        changeMethod: string | null;
        changeUSD: number;
        payments: Array<{
            amount: number;
            currency: string;
            method: string;
            amountUSD: number;
        }>;
        services: Array<{
            name: string;
            price: number;
        }>;
    }>;
    expenses?: Array<{
        id: string;
        description: string;
        amountUSD: number;
        category: string;
        createdAt: string;
    }>;
    washerEarnings?: Array<{
        id: string;
        washerName: string;
        orderId: number;
        commissionAmount: number;
        status: string;
        earnedAt: string;
    }>;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/reports`;

    getReport(period: string, startDate?: Date, endDate?: Date): Observable<Report> {
        let params = new HttpParams().set('period', period);
        if (startDate) {
            params = params.set('startDate', startDate.toISOString());
        }
        if (endDate) {
            params = params.set('endDate', endDate.toISOString());
        }
        return this.http.get<Report>(`${this.apiUrl}`, { params });
    }
}

