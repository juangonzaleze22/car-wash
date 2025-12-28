import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

interface ClientLoginResponse {
    token: string;
    client: {
        id: string;
        name: string;
        phone: string;
        type: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ClientAuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private apiUrl = 'http://localhost:3000/api/auth';
    currentClient = signal<any>(null);

    constructor() {
        const savedClient = localStorage.getItem('client');
        if (savedClient) {
            this.currentClient.set(JSON.parse(savedClient));
        }
    }

    login(credentials: { phone: string; password: string }) {
        return this.http.post<ClientLoginResponse>(`${this.apiUrl}/client-login`, credentials).pipe(
            tap(response => {
                localStorage.setItem('clientToken', response.token);
                localStorage.setItem('client', JSON.stringify(response.client));
                this.currentClient.set(response.client);
                this.router.navigate(['/client/dashboard']);
            })
        );
    }

    logout() {
        localStorage.removeItem('clientToken');
        localStorage.removeItem('client');
        this.currentClient.set(null);
        this.router.navigate(['/client/login']);
    }

    getToken(): string | null {
        return localStorage.getItem('clientToken');
    }

    isAuthenticated(): boolean {
        return !!this.getToken() && !!this.currentClient();
    }
}

