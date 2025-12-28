import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Service {
    id: string;
    name: string;
    description?: string; // Descripción opcional
    categoryTarget: string;
    categoryTargetId?: string;
    categoryTargetRef?: {
        id: string;
        name: string;
        code: string;
    };
    price: number;
    commissionPercentage: number;
    active: boolean;
}

export interface CreateServiceDto {
    name: string;
    description?: string; // Descripción opcional
    categoryTarget?: string; // Opcional para compatibilidad
    categoryTargetId?: string; // Preferido: UUID de categoría dinámica
    price: number;
    commissionPercentage: number;
    active?: boolean;
}

export interface UpdateServiceDto {
    name?: string;
    description?: string; // Descripción opcional
    categoryTarget?: string;
    categoryTargetId?: string;
    price?: number;
    commissionPercentage?: number;
    active?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ServiceService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/services';

    getServices(activeOnly: boolean = false, categoryId?: string): Observable<Service[]> {
        const params: any = {};
        if (activeOnly) {
            params.active = 'true';
        }
        if (categoryId) {
            params.categoryId = categoryId;
        }
        return this.http.get<Service[]>(this.apiUrl, { params });
    }

    getServiceById(id: string): Observable<Service> {
        return this.http.get<Service>(`${this.apiUrl}/${id}`);
    }

    createService(service: CreateServiceDto): Observable<Service> {
        return this.http.post<Service>(this.apiUrl, service);
    }

    updateService(id: string, service: UpdateServiceDto): Observable<Service> {
        return this.http.patch<Service>(`${this.apiUrl}/${id}`, service);
    }

    deleteService(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Obtener servicios activos (público, sin autenticación)
     * Para uso en catálogo de clientes
     */
    getPublicServices(categoryId?: string): Observable<Service[]> {
        const params: any = {};
        if (categoryId) {
            params.categoryId = categoryId;
        }
        return this.http.get<Service[]>(`http://localhost:3000/api/client/services`, { params });
    }
}

