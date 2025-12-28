import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExchangeRate {
    buy: number;
    sell: number;
    average: number;
    source: string;
    lastUpdated: string;
}

export interface ExchangeRatesResponse {
    success: boolean;
    data: {
        usd: ExchangeRate;
        eur: ExchangeRate;
    };
    timestamp: string;
}

export interface SingleExchangeRateResponse {
    success: boolean;
    data: ExchangeRate;
    timestamp: string;
}

@Injectable({
    providedIn: 'root'
})
export class ExchangeRateService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api';

    private getHeaders(): HttpHeaders {
        // Intentar obtener token de empleado primero, luego de cliente
        const token = localStorage.getItem('token') || localStorage.getItem('clientToken');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    /**
     * Obtiene las tasas de cambio del dólar y euro
     */
    getExchangeRates(): Observable<ExchangeRatesResponse> {
        return this.http.get<ExchangeRatesResponse>(`${this.apiUrl}/exchange-rates`, {
            headers: this.getHeaders()
        });
    }

    /**
     * Obtiene solo la tasa de cambio del dólar
     */
    getUSDExchangeRate(): Observable<SingleExchangeRateResponse> {
        return this.http.get<SingleExchangeRateResponse>(`${this.apiUrl}/exchange-rates/usd`, {
            headers: this.getHeaders()
        });
    }

    /**
     * Obtiene solo la tasa de cambio del euro
     */
    getEURExchangeRate(): Observable<SingleExchangeRateResponse> {
        return this.http.get<SingleExchangeRateResponse>(`${this.apiUrl}/exchange-rates/eur`, {
            headers: this.getHeaders()
        });
    }
}

