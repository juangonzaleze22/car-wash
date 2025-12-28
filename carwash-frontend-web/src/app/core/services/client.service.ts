import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Client {
    id: string;
    name: string;
    phone: string;
    type: 'PARTICULAR' | 'CORPORATE';
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class ClientService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/clients';

    searchClients(name: string): Observable<Client[]> {
        const params = new HttpParams().set('name', name);
        return this.http.get<Client[]>(`${this.apiUrl}/search`, { params });
    }

    getClients(): Observable<Client[]> {
        // Por ahora, usamos search con string vacío para obtener todos
        // En el futuro se puede agregar un endpoint específico
        return this.http.get<Client[]>(`${this.apiUrl}/search`, { 
            params: new HttpParams().set('name', '') 
        });
    }
}

