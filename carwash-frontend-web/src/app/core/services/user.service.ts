import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Washer {
    id: string;
    username: string;
    name?: string | null;
    active?: boolean;
}

// Alias para compatibilidad con código existente
export interface User {
    id: string;
    username: string;
    name?: string | null;
}

export interface CreateWasherDto {
    username: string;
    name?: string;
    password: string;
}

export interface UpdateWasherDto {
    username?: string;
    name?: string | null;
    password?: string;
    active?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/users';

    getWashers(includeInactive: boolean = false): Observable<Washer[]> {
        return this.http.get<Washer[]>(`${this.apiUrl}/washers`, {
            params: includeInactive ? { includeInactive: 'true' } : {}
        });
    }

    // Método para compatibilidad con código existente (solo activos, sin campo active)
    getActiveWashers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/washers`);
    }

    createWasher(washer: CreateWasherDto): Observable<Washer> {
        return this.http.post<Washer>(`${this.apiUrl}/washers`, washer);
    }

    updateWasher(id: string, washer: UpdateWasherDto): Observable<Washer> {
        return this.http.patch<Washer>(`${this.apiUrl}/washers/${id}`, washer);
    }

    deleteWasher(id: string): Observable<Washer> {
        return this.http.delete<Washer>(`${this.apiUrl}/washers/${id}`);
    }
}
