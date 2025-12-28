import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { ClientDashboardService, ClientDashboard, OrderDetails } from '../../../core/services/client-dashboard.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { VesCurrencyPipe } from '../../../shared/pipes/ves-currency.pipe';
import { UsdCurrencyPipe } from '../../../shared/pipes/usd-currency.pipe';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-client-dashboard',
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
        VesCurrencyPipe,
        UsdCurrencyPipe,
        RouterLink
    ],
    providers: [MessageService],
    templateUrl: './client-dashboard.component.html',
    styleUrl: './client-dashboard.component.css'
})
export class ClientDashboardComponent implements OnInit, OnDestroy {
    private dashboardService = inject(ClientDashboardService);
    private messageService = inject(MessageService);
    private exchangeRateService = inject(ExchangeRateService);
    private webSocketService = inject(WebSocketService);
    private vesCurrencyPipe = new VesCurrencyPipe();
    private usdCurrencyPipe = new UsdCurrencyPipe();

    dashboard = signal<ClientDashboard | null>(null);
    loading = signal(true);
    selectedOrder = signal<OrderDetails | null>(null);
    showOrderDialog = signal(false);
    loadingOrder = signal(false);

    // Tasa de cambio
    exchangeRate = signal<number>(0);
    loadingExchangeRate = signal(false);

    private socketSubscription?: Subscription;

    ngOnInit() {
        this.loadDashboard();
        this.loadExchangeRate();
        this.setupSocketListeners();
    }

    ngOnDestroy() {
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
    }

    setupSocketListeners() {
        // Escuchar actualizaciones de órdenes en tiempo real
        this.socketSubscription = this.webSocketService.listen<any>('orders:updated').subscribe((data: any) => {
            if (data && data.order) {
                const updatedOrder = data.order;
                const currentDashboard = this.dashboard();

                if (!currentDashboard) return;

                // Verificar si la orden pertenece al cliente actual
                // El backend envía la orden completa con vehicle.clientId
                const orderBelongsToClient = updatedOrder.vehicle?.clientId === currentDashboard.client?.id;

                if (!orderBelongsToClient) return;

                // Verificar si la orden está en las órdenes pendientes
                const isPendingOrder = currentDashboard.pendingOrders.some(order =>
                    order.id === updatedOrder.id || order.uuid === updatedOrder.uuid
                );

                // Si es una orden pendiente o si no estaba pendiente pero ahora lo es
                if (isPendingOrder || (updatedOrder.status !== 'COMPLETED' && updatedOrder.status !== 'CANCELLED')) {
                    const oldOrder = currentDashboard.pendingOrders.find(order =>
                        order.id === updatedOrder.id || order.uuid === updatedOrder.uuid
                    );
                    const oldStatus = oldOrder?.status;

                    // Recargar el dashboard para obtener la información actualizada
                    this.loadDashboard();

                    // Mostrar notificación si el estado cambió
                    if (oldStatus && updatedOrder.status !== oldStatus) {
                        this.messageService.add({
                            severity: 'info',
                            summary: 'Orden Actualizada',
                            detail: `Tu orden ha cambiado a: ${this.getStatusLabel(updatedOrder.status)}`
                        });
                    }
                }
            }
        });
    }

    loadDashboard() {
        this.loading.set(true);
        this.dashboardService.getDashboard().subscribe({
            next: (data) => {
                console.log('Dashboard data received:', data);
                // Asegurar que pendingOrders existe, si no, inicializarlo como array vacío
                if (!data.pendingOrders) {
                    data.pendingOrders = [];
                }
                this.dashboard.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error loading dashboard:', err);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al cargar el dashboard'
                });
                this.loading.set(false);
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

    // Métodos para el timeline con órdenes individuales
    isStepActiveForOrder(order: any, stepStatus: string): boolean {
        const currentStatus = order?.status;
        if (!currentStatus) return false;

        const statusOrder = ['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'WAITING_PAYMENT', 'COMPLETED'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const stepIndex = statusOrder.indexOf(stepStatus);

        if (stepStatus === 'RECEIVED') {
            return currentIndex >= 0; // Siempre activa si existe la orden
        } else if (stepStatus === 'IN_PROGRESS') {
            return currentIndex >= 1; // Activa si está en proceso o posterior
        } else if (stepStatus === 'QUALITY_CHECK' || stepStatus === 'WAITING_PAYMENT') {
            return currentIndex >= 2; // Activa si está en control, esperando pago o completada
        } else if (stepStatus === 'COMPLETED') {
            return currentIndex >= 4; // Solo activa si está completada
        }

        return false;
    }

    isStepCompletedForOrder(order: any, stepStatus: string): boolean {
        const currentStatus = order?.status;
        if (!currentStatus) return false;

        const statusOrder = ['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'WAITING_PAYMENT', 'COMPLETED'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const stepIndex = statusOrder.indexOf(stepStatus);

        // Una línea está completa si el estado actual es posterior al paso
        return currentIndex > stepIndex;
    }

    formatElapsedTime(minutes: number): string {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} h`;
        }
        return `${hours} h ${remainingMinutes} min`;
    }

}

