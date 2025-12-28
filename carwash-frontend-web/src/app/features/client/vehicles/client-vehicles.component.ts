import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ClientDashboardService, ClientDashboard } from '../../../core/services/client-dashboard.service';

@Component({
    selector: 'app-client-vehicles',
    standalone: true,
    imports: [
        CommonModule,
        CardModule,
        SkeletonModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './client-vehicles.component.html',
    styleUrl: './client-vehicles.component.css'
})
export class ClientVehiclesComponent implements OnInit {
    private dashboardService = inject(ClientDashboardService);
    private messageService = inject(MessageService);

    dashboard = signal<ClientDashboard | null>(null);
    loading = signal(true);

    ngOnInit() {
        this.loadDashboard();
    }

    loadDashboard() {
        this.loading.set(true);
        this.dashboardService.getDashboard().subscribe({
            next: (data) => {
                this.dashboard.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los vehículos'
                });
                this.loading.set(false);
            }
        });
    }
}

