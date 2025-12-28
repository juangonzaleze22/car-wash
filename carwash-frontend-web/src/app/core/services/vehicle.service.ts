import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum VehicleCategory {
    MOTO = 'MOTO',
    AUTO = 'AUTO',
    SUV = 'SUV',
    PICKUP = 'PICKUP',
    CAMION = 'CAMION'
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    type: 'PARTICULAR' | 'CORPORATE';
    createdAt: string;
}

export interface Vehicle {
    id: string;
    plate: string;
    category: VehicleCategory;
    clientId: string;
    notes?: string;
    client?: Client;
    orders?: Array<{
        id: number;
        status: string;
        createdAt: string;
    }>;
}

export interface CreateVehicleDto {
    plate: string;
    category: VehicleCategory;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    notes?: string;
}

export interface UpdateVehicleDto {
    plate?: string;
    category?: VehicleCategory;
    clientId?: string;
    notes?: string;
}

export interface VehiclesResponse {
    vehicles: Vehicle[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class VehicleService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/vehicles';

    searchVehicles(plate: string): Observable<Vehicle[]> {
        const params = new HttpParams().set('plate', plate);
        return this.http.get<Vehicle[]>(`${this.apiUrl}/search`, { params });
    }

    getVehicles(params?: {
        page?: number;
        limit?: number;
        plate?: string;
        category?: VehicleCategory;
    }): Observable<VehiclesResponse> {
        let httpParams = new HttpParams();
        if (params?.page) {
            httpParams = httpParams.set('page', params.page.toString());
        }
        if (params?.limit) {
            httpParams = httpParams.set('limit', params.limit.toString());
        }
        if (params?.plate) {
            httpParams = httpParams.set('plate', params.plate);
        }
        if (params?.category) {
            httpParams = httpParams.set('category', params.category);
        }
        return this.http.get<VehiclesResponse>(this.apiUrl, { params: httpParams });
    }

    getVehicleById(id: string): Observable<Vehicle> {
        return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
    }

    createVehicle(data: CreateVehicleDto): Observable<Vehicle> {
        return this.http.post<Vehicle>(this.apiUrl, data);
    }

    createClientVehicle(data: { plate: string; category: string }): Observable<Vehicle> {
        const clientApiUrl = 'http://localhost:3000/api/client/vehicles';
        return this.http.post<Vehicle>(clientApiUrl, data);
    }


    updateVehicle(id: string, data: UpdateVehicleDto): Observable<Vehicle> {
        return this.http.patch<Vehicle>(`${this.apiUrl}/${id}`, data);
    }

    deleteVehicle(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }

    getCategoryLabel(category: VehicleCategory): string {
        const labels: Record<VehicleCategory, string> = {
            [VehicleCategory.MOTO]: 'Moto',
            [VehicleCategory.AUTO]: 'Auto',
            [VehicleCategory.SUV]: 'SUV',
            [VehicleCategory.PICKUP]: 'Pickup',
            [VehicleCategory.CAMION]: 'Camión',
        };
        return labels[category] || category;
    }
}

