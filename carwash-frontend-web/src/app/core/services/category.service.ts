import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VehicleCategory {
    id: string;
    name: string;
    code: string;
    description?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        vehicles: number;
        services: number;
    };
    servicesPerformed?: number; // Cantidad de servicios realizados (OrderItems de órdenes completadas)
}

export interface CreateCategoryDto {
    name: string;
    code: string;
    description?: string;
    active?: boolean;
}

export interface UpdateCategoryDto {
    name?: string;
    code?: string;
    description?: string;
    active?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/categories';

    getCategories(activeOnly: boolean = false): Observable<VehicleCategory[]> {
        const params = activeOnly ? new HttpParams().set('active', 'true') : new HttpParams();
        return this.http.get<VehicleCategory[]>(this.apiUrl, { params });
    }

    getCategoryById(id: string): Observable<VehicleCategory> {
        return this.http.get<VehicleCategory>(`${this.apiUrl}/${id}`);
    }

    createCategory(data: CreateCategoryDto): Observable<VehicleCategory> {
        return this.http.post<VehicleCategory>(this.apiUrl, data);
    }

    updateCategory(id: string, data: UpdateCategoryDto): Observable<VehicleCategory> {
        return this.http.patch<VehicleCategory>(`${this.apiUrl}/${id}`, data);
    }

    deleteCategory(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
    }
}

