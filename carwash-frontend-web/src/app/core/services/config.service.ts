import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SystemConfig {
    id: string;
    key: string;
    value: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/configs';

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('token') || localStorage.getItem('clientToken');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    getConfigs(): Observable<SystemConfig[]> {
        return this.http.get<SystemConfig[]>(this.apiUrl, {
            headers: this.getHeaders()
        });
    }

    getConfig(key: string): Observable<SystemConfig> {
        return this.http.get<SystemConfig>(`${this.apiUrl}/${key}`, {
            headers: this.getHeaders()
        });
    }

    updateConfig(key: string, data: { value: string, description?: string }): Observable<SystemConfig> {
        return this.http.patch<SystemConfig>(`${this.apiUrl}/${key}`, data, {
            headers: this.getHeaders()
        });
    }

    getDeliveryFee(): Observable<{ deliveryFee: number }> {
        return this.http.get<{ deliveryFee: number }>(`${this.apiUrl}/delivery-fee`, {
            headers: this.getHeaders()
        });
    }
}
