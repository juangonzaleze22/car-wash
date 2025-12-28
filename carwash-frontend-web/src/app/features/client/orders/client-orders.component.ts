import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ClientDashboardService, ClientDashboard, OrderDetails } from '../../../core/services/client-dashboard.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { VesCurrencyPipe } from '../../../shared/pipes/ves-currency.pipe';
import { UsdCurrencyPipe } from '../../../shared/pipes/usd-currency.pipe';

@Component({
    selector: 'app-client-orders',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        TagModule,
        ButtonModule,
        TableModule,
        SkeletonModule,
        ToastModule,
        DialogModule,
        DropdownModule,
        TooltipModule,
        VesCurrencyPipe,
        UsdCurrencyPipe
    ],
    providers: [MessageService],
    templateUrl: './client-orders.component.html',
    styleUrl: './client-orders.component.css'
})
export class ClientOrdersComponent implements OnInit {
    private dashboardService = inject(ClientDashboardService);
    private messageService = inject(MessageService);
    private exchangeRateService = inject(ExchangeRateService);
    private vesCurrencyPipe = new VesCurrencyPipe();
    private usdCurrencyPipe = new UsdCurrencyPipe();

    dashboard = signal<ClientDashboard | null>(null);
    loading = signal(true);
    selectedOrder = signal<OrderDetails | null>(null);
    showOrderDialog = signal(false);
    loadingOrder = signal(false);
    
    // Filtros para historial
    selectedVehicleFilter = signal<string | null>(null);
    vehicleFilterOptions = computed(() => {
        const vehicles = this.dashboard()?.vehicles || [];
        return [
            { label: 'Todos los vehículos', value: null },
            ...vehicles.map(v => ({ label: `${v.plate} (${v.categoryRef?.name || v.category})`, value: v.id }))
        ];
    });
    
    // Tasa de cambio
    exchangeRate = signal<number>(0);
    loadingExchangeRate = signal(false);

    // Historial filtrado
    filteredHistory = computed(() => {
        const history = this.dashboard()?.history || [];
        const vehicleFilter = this.selectedVehicleFilter();
        
        if (!vehicleFilter) {
            return history;
        }
        
        return history.filter(order => order.vehicleId === vehicleFilter);
    });

    ngOnInit() {
        this.loadDashboard();
        this.loadExchangeRate();
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
                    detail: 'Error al cargar las órdenes'
                });
                this.loading.set(false);
            }
        });
    }

    loadExchangeRate() {
        this.loadingExchangeRate.set(true);
        this.exchangeRateService.getUSDExchangeRate().subscribe({
            next: (response) => {
                this.exchangeRate.set(response.data.average);
                this.loadingExchangeRate.set(false);
            },
            error: (err) => {
                console.error('Error loading exchange rate:', err);
                this.loadingExchangeRate.set(false);
            }
        });
    }

    viewOrderDetails(orderId: number) {
        this.loadingOrder.set(true);
        this.showOrderDialog.set(true);
        this.dashboardService.getOrderDetails(orderId).subscribe({
            next: (order) => {
                this.selectedOrder.set(order);
                this.loadingOrder.set(false);
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar los detalles de la orden'
                });
                this.loadingOrder.set(false);
            }
        });
    }

    getStatusSeverity(status: string): "success" | "secondary" | "info" | "warning" | "danger" | "contrast" | undefined {
        const statusMap: { [key: string]: "success" | "secondary" | "info" | "warning" | "danger" | "contrast" | undefined } = {
            'RECEIVED': 'info',
            'IN_PROGRESS': 'warning',
            'QUALITY_CHECK': 'warning',
            'WAITING_PAYMENT': 'warning',
            'COMPLETED': 'success',
            'CANCELLED': 'danger'
        };
        return statusMap[status] || 'info';
    }

    getStatusLabel(status: string): string {
        const labelMap: { [key: string]: string } = {
            'RECEIVED': 'Recibida',
            'IN_PROGRESS': 'En Proceso',
            'QUALITY_CHECK': 'Control de Calidad',
            'WAITING_PAYMENT': 'Esperando Pago',
            'COMPLETED': 'Completada',
            'CANCELLED': 'Cancelada'
        };
        return labelMap[status] || status;
    }

    formatVES(amount: number): string {
        if (!amount || amount === 0) {
            return 'Bs. 0,00';
        }
        const rate = this.exchangeRate();
        if (!rate || rate === 0) {
            return 'Bs. 0,00';
        }
        const vesAmount = amount * rate;
        return this.vesCurrencyPipe.transform(vesAmount);
    }

    formatUSD(amount: number): string {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$0,00';
        }
        return this.usdCurrencyPipe.transform(amount);
    }
}

