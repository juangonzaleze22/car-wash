import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

interface LoginResponse {
    token: string;
    user: {
        id: string;
        username: string;
        role: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3000/api/auth';
    currentUser = signal<any>(null);

    constructor(private http: HttpClient, private router: Router) {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.currentUser.set(JSON.parse(savedUser));
        }
    }

    login(credentials: any) {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                this.currentUser.set(response.user);

                // Redirect based on role
                if (response.user.role === 'SUPERVISOR') {
                    this.router.navigate(['/supervisor']);
                } else if (response.user.role === 'ADMIN') {
                    this.router.navigate(['/admin']);
                } else if (response.user.role === 'CASHIER') {
                    this.router.navigate(['/cashier']);
                } else if (response.user.role === 'WASHER') {
                    this.router.navigate(['/washer']);
                }
            })
        );
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser.set(null);
        this.router.navigate(['/login']);
    }
}
