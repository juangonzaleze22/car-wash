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

    getBranding(): Observable<SystemConfig[]> {
        return this.http.get<SystemConfig[]>(`${this.apiUrl}/branding`);
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

    uploadLogo(file: File): Observable<SystemConfig> {
        const formData = new FormData();
        formData.append('logo', file);
        formData.append('description', 'Logo del negocio');

        return this.http.post<SystemConfig>(`${this.apiUrl}/logo`, formData, {
            headers: new HttpHeaders({
                'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('clientToken')}`
            })
        });
    }

    getDeliveryFee(): Observable<{ deliveryFee: number }> {
        return this.http.get<{ deliveryFee: number }>(`${this.apiUrl}/delivery-fee`, {
            headers: this.getHeaders()
        });
    }
}
