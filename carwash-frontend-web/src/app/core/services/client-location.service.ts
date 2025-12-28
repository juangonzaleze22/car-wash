import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClientAuthService } from './client-auth.service';

export interface ClientLocation {
    id: string;
    clientId: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    createdAt: string;
}

export interface CreateLocationDto {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
}

@Injectable({
    providedIn: 'root'
})
export class ClientLocationService {
    private http = inject(HttpClient);
    private clientAuthService = inject(ClientAuthService);
    private apiUrl = 'http://localhost:3000/api/client/locations';

    private getHeaders(): HttpHeaders {
        const token = this.clientAuthService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    getLocations(): Observable<ClientLocation[]> {
        return this.http.get<ClientLocation[]>(this.apiUrl, {
            headers: this.getHeaders()
        });
    }

    saveLocation(location: CreateLocationDto): Observable<ClientLocation> {
        return this.http.post<ClientLocation>(this.apiUrl, location, {
            headers: this.getHeaders()
        });
    }

    deleteLocation(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`, {
            headers: this.getHeaders()
        });
    }
}
