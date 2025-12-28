import { Component, input, output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';
import { TimelineModule } from 'primeng/timeline';
import { GalleriaModule } from 'primeng/galleria';
import { TabViewModule } from 'primeng/tabview';
import { environment } from '../../../../environments/environment';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { VesCurrencyPipe } from '../../pipes/ves-currency.pipe';
import { UsdCurrencyPipe } from '../../pipes/usd-currency.pipe';

interface Order {
    id: number;
    uuid: string;
    status: string;
    totalAmount: number;
    paymentMethod?: string;
    cancellationReason?: string | null;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    closedAt?: string;
    vehicle: {
        plate: string;
        category: string;
        client: {
            name: string;
            phone: string;
            type?: string;
        };
    };
    images?: string[] | any[];
    supervisor: {
        id: string;
        username: string;
    };
    items: Array<{
        service: {
            name: string;
            price?: number;
        };
        assignedWasher: {
            id: string;
            username: string;
        } | null;
        commissionAmount?: number;
    }>;
    payments?: Array<{
        amount: number;
        currency: string;
        method: string;
        exchangeRate?: number;
        amountUSD?: number;
        reference?: string;
        cashier: {
            username: string;
        } | null;
        createdAt: string;
    }>;
}

@Component({
    selector: 'app-order-detail-modal',
    standalone: true,
    imports: [
        CommonModule,
        DialogModule,
        TagModule,
        DividerModule,
        CardModule,
        ButtonModule,
        ChipModule,
        AvatarModule,
        TimelineModule,
        GalleriaModule,
        TabViewModule,
        VesCurrencyPipe,
        UsdCurrencyPipe
    ],
    templateUrl: './order-detail-modal.component.html',
    styleUrl: './order-detail-modal.component.css'
})
export class OrderDetailModalComponent implements OnInit {
    order = input<any | null>(null);
    visible = input.required<boolean>();
    
    onClose = output<void>();

    private exchangeRateService = inject(ExchangeRateService);
    exchangeRate = signal<number>(0);
    loadingExchangeRate = signal(true);
    
    // Pipes para formateo de moneda
    private vesPipe = new VesCurrencyPipe();
    private usdPipe = new UsdCurrencyPipe();

    ngOnInit() {
        this.loadExchangeRate();
    }

    loadExchangeRate() {
        this.loadingExchangeRate.set(true);
        this.exchangeRateService.getUSDExchangeRate().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.exchangeRate.set(response.data.average);
                } else {
                    this.exchangeRate.set(240);
                }
                this.loadingExchangeRate.set(false);
            },
            error: (err) => {
                console.error('Error al cargar tasa de cambio:', err);
                this.exchangeRate.set(240);
                this.loadingExchangeRate.set(false);
            }
        });
    }

    /**
     * Convierte un precio en USD a VES según la tasa actual
     */
    convertToVES(usdAmount: number): number {
        const rate = this.exchangeRate();
        if (!rate || rate === 0) return 0;
        return usdAmount * rate;
    }

    /**
     * Formatea un precio en bolívares según el estándar establecido
     */
    formatVES(vesAmount: number): string {
        return this.vesPipe.transform(vesAmount);
    }

    /**
     * Formatea un precio en USD
     */
    formatUSD(usdAmount: number): string {
        return this.usdPipe.transform(usdAmount);
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
        const statusMap: { [key: string]: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined } = {
            'RECEIVED': 'info',
            'IN_PROGRESS': 'warning',
            'QUALITY_CHECK': 'info',
            'WAITING_PAYMENT': 'warning',
            'COMPLETED': 'success',
            'CANCELLED': 'danger'
        };
        return statusMap[status] || 'info';
    }

    getStatusLabel(status: string): string {
        const statusMap: { [key: string]: string } = {
            'RECEIVED': 'Recibida',
            'IN_PROGRESS': 'En Progreso',
            'QUALITY_CHECK': 'Control de Calidad',
            'WAITING_PAYMENT': 'Esperando Pago',
            'COMPLETED': 'Completada',
            'CANCELLED': 'Cancelada'
        };
        return statusMap[status] || status;
    }

    getMethodLabel(method: string): string {
        const methodMap: { [key: string]: string } = {
            'CASH': 'Efectivo',
            'CARD': 'Tarjeta',
            'TRANSFER': 'Transferencia'
        };
        return methodMap[method] || method;
    }

    getMethodIcon(method: string): string {
        const iconMap: { [key: string]: string } = {
            'CASH': 'pi-money-bill',
            'CARD': 'pi-credit-card',
            'TRANSFER': 'pi-arrow-right-arrow-left'
        };
        return iconMap[method] || 'pi-circle';
    }

    handleClose() {
        this.onClose.emit();
    }

    getImageUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        
        // Obtener la URL base del servidor (sin /api)
        // environment.apiUrl es 'http://localhost:3000/api'
        const baseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
        
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    }

    handleImageError(event: any) {
        // Si la imagen falla al cargar, mostrar una imagen placeholder
        event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
    }

    getWasherNameForItem(item: any): string | null {
        if (item.assignedWasher) {
            return item.assignedWasher.username;
        }
        return null;
    }

    hasImages(): boolean {
        const order = this.order();
        if (!order || !order.images) return false;
        return Array.isArray(order.images) && order.images.length > 0;
    }

    getClientTypeLabel(type?: string): string {
        if (!type) return 'Particular';
        return type === 'CORPORATE' ? 'Empresa' : 'Particular';
    }

    getSubtotal(): number {
        const order = this.order();
        if (!order || !order.items) return 0;
        return order.items.reduce((sum: number, item: any) => {
            return sum + (item.service?.price || 0);
        }, 0);
    }

    getPaymentMethodLabel(): string {
        const order = this.order();
        if (!order || !order.paymentMethod) return 'N/A';
        const methodMap: { [key: string]: string } = {
            'SPLIT': 'Dividido',
            'CASH': 'Efectivo',
            'CARD': 'Tarjeta',
            'TRANSFER': 'Transferencia'
        };
        return methodMap[order.paymentMethod] || order.paymentMethod;
    }

    getRelativeTime(date: string): string {
        if (!date) return '';
        const now = new Date();
        const past = new Date(date);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'hace un momento';
        if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
        if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
        return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    }

    getTimelineEvents(): any[] {
        const order = this.order();
        if (!order) return [];

        const events: any[] = [];

        // Created
        events.push({
            status: 'Orden Creada',
            date: order.createdAt,
            icon: 'pi pi-file-plus',
            color: 'bg-blue-500'
        });

        // Started
        if (order.startedAt) {
            events.push({
                status: 'Lavado Iniciado',
                date: order.startedAt,
                icon: 'pi pi-play-circle',
                color: 'bg-yellow-500'
            });
        }

        // Completed
        if (order.completedAt) {
            events.push({
                status: 'Lavado Completado',
                date: order.completedAt,
                icon: 'pi pi-check-circle',
                color: 'bg-green-500'
            });
        }

        // Closed
        if (order.closedAt) {
            events.push({
                status: 'Orden Cerrada',
                date: order.closedAt,
                icon: 'pi pi-lock',
                color: 'bg-gray-600'
            });
        }

        return events;
    }

    getServiceDuration(): string {
        const order = this.order();
        if (!order) return 'N/A';

        const startDate = order.startedAt;
        const endDate = order.completedAt || order.closedAt;

        if (!startDate) return 'No iniciado';
        if (!endDate) return 'En progreso';

        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end.getTime() - start.getTime();

        if (diffMs < 0) return 'N/A';

        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        const remainingHours = diffHours % 24;
        const remainingMins = diffMins % 60;
        const remainingSecs = Math.floor((diffMs % 60000) / 1000);

        if (diffDays > 0) {
            return `${diffDays}d ${remainingHours}h ${remainingMins}m`;
        } else if (diffHours > 0) {
            return `${diffHours}h ${remainingMins}m ${remainingSecs}s`;
        } else if (diffMins > 0) {
            return `${diffMins}m ${remainingSecs}s`;
        } else {
            return `${remainingSecs}s`;
        }
    }

    hasServiceDuration(): boolean {
        const order = this.order();
        if (!order) return false;
        return !!(order.startedAt && (order.completedAt || order.closedAt));
    }

    /**
     * Calcula el total pagado en USD
     */
    getTotalPaidUSD(): number {
        const order = this.order();
        if (!order || !order.payments || order.payments.length === 0) {
            return 0;
        }
        
        let totalPaid = 0;
        for (const payment of order.payments) {
            const paymentAny = payment as any;
            if (paymentAny.amountUSD !== undefined) {
                totalPaid += Number(paymentAny.amountUSD);
            } else if (payment.currency === 'USD') {
                totalPaid += payment.amount;
            } else {
                const paymentAny = payment as any;
                if (paymentAny.exchangeRate) {
                    totalPaid += payment.amount / Number(paymentAny.exchangeRate);
                } else {
                    totalPaid += payment.amount / 240; // Fallback
                }
            }
        }
        return totalPaid;
    }

    /**
     * Verifica si la orden está completamente pagada
     */
    isOrderFullyPaid(): boolean {
        const order = this.order();
        if (!order) return false;
        const totalPaid = this.getTotalPaidUSD();
        const orderTotal = Number(order.totalAmount);
        return totalPaid >= orderTotal - 0.01;
    }

    /**
     * Obtiene el monto restante por pagar
     */
    getRemainingAmount(): number {
        const order = this.order();
        if (!order) return 0;
        const totalPaid = this.getTotalPaidUSD();
        const orderTotal = Number(order.totalAmount);
        return Math.max(0, orderTotal - totalPaid);
    }
}
