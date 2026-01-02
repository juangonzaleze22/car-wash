import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WasherKPIs {
    totalEarnings: number;
    totalOrders: number;
    pendingEarnings: number;
    pendingOrders: number;
    paidEarnings: number;
    paidOrders: number;
    monthlyEarnings: number;
    monthlyOrders: number;
    dailyEarnings: number;
    dailyOrders: number;
    completedOrders: number;
    avgEarningsPerOrder: number;
}

export interface AdminKPIs {
    // Ganancias de lavadores
    totalWasherEarnings: number;
    totalWasherOrders: number;
    totalPendingEarnings: number;
    totalPendingOrders: number;
    weeklyEarnings: number;
    weeklyOrders: number;

    // Ingresos
    monthlyRevenue: number;
    monthlyOrders: number;
    dailyRevenue: number;
    dailyOrders: number;

    // Ganancias netas del negocio
    netProfit: number;
    periodWasherEarnings: number;

    // Gastos
    totalExpenses: number;
    totalExpensesCount: number;
    periodExpenses: number;
    periodExpensesCount: number;
    expensesByCategory: Array<{
        category: string;
        total: number;
        count: number;
    }>;

    // Órdenes
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;

    // Lavadores
    activeWashers: number;
    topWashers: Array<{
        washerId: string;
        washerName: string;
        totalEarnings: number;
        totalOrders: number;
    }>;

    // Tiempo promedio
    avgTimePerOrder: number;
    avgTimeByWasher: Array<{
        washerId: string;
        washerName: string;
        avgTimeMinutes: number;
        totalOrders: number;
    }>;
    avgTimeByServiceAndWasher: Array<{
        serviceId: string;
        serviceName: string;
        washerId: string;
        washerName: string;
        avgTimeMinutes: number;
        totalOrders: number;
    }>;
    serviceAverages: Array<{
        serviceId: string;
        serviceName: string;
        avgTimeMinutes: number;
    }>;

    // Distribución
    earningsByStatus: Array<{
        status: string;
        total: number;
        count: number;
    }>;

    // Estadísticas por categoría de vehículo
    servicesByCategory: Array<{
        categoryId: string;
        categoryName: string;
        categoryCode: string;
        serviceCount: number;
        totalRevenue: number;
        percentage: number;
    }>;
}

export interface ChartData {
    dates: string[];
    totals?: number[];
    pendings?: number[];
    paids?: number[];
    counts?: number[];
    revenues?: number[];
    earnings?: number[];
    orders?: number[];
    expenses?: number[];
    netProfit?: number[];
    interval?: 'day' | 'week' | 'month'; // Intervalo de agregación usado
}

export interface WasherEfficiencyData {
    services: string[];
    washerAverages: number[];
    globalAverages: number[];
}

export interface ClientChartData {
    trend: {
        dates: string[];
        spending: number[];
        visits: number[];
    };
    distribution: {
        labels: string[];
        values: number[];
    };
}

@Injectable({
    providedIn: 'root'
})
export class KPIService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/kpi';

    getWasherKPIs(startDate?: Date, endDate?: Date): Observable<WasherKPIs> {
        let url = `${this.apiUrl}/washer`;
        const params: any = {};
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();
        return this.http.get<WasherKPIs>(url, { params });
    }

    getAdminKPIs(startDate?: Date, endDate?: Date): Observable<AdminKPIs> {
        let url = `${this.apiUrl}/admin`;
        const params: any = {};
        if (startDate) params.startDate = startDate.toISOString();
        if (endDate) params.endDate = endDate.toISOString();
        return this.http.get<AdminKPIs>(url, { params });
    }

    getWasherChartData(startDate: Date, endDate: Date): Observable<ChartData> {
        return this.http.get<ChartData>(`${this.apiUrl}/washer/chart-data`, {
            params: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        });
    }

    getAdminChartData(startDate: Date, endDate: Date): Observable<ChartData> {
        return this.http.get<ChartData>(`${this.apiUrl}/admin/chart-data`, {
            params: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        });
    }

    getWasherEfficiencyData(): Observable<WasherEfficiencyData> {
        return this.http.get<WasherEfficiencyData>(`${this.apiUrl}/washer/efficiency`);
    }

    getClientChartData(startDate: Date, endDate: Date): Observable<ClientChartData> {
        return this.http.get<ClientChartData>(`${this.apiUrl}/client/chart-data`, {
            params: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            }
        });
    }
}

