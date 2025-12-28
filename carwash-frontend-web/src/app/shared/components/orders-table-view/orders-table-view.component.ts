import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { OverlayModule } from 'primeng/overlay';
import { Order } from '../../interfaces/order.interface';

interface StatusOption {
    label: string;
    value: string;
    icon: string;
    severity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined;
}

@Component({
    selector: 'app-orders-table-view',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        TooltipModule,
        MenuModule,
        OverlayModule
    ],
    templateUrl: './orders-table-view.component.html',
    styleUrl: './orders-table-view.component.css'
})
export class OrdersTableViewComponent {
    orders = input.required<Order[]>();
    loading = input<boolean>(false);
    isAdmin = input<boolean>(false);

    onViewDetail = output<Order>();
    onProcessPayment = output<Order>();
    onStatusChange = output<{ order: Order; newStatus: string }>();
    onShowCancellationReason = output<Order>();
    onDelete = output<Order>();

    statusOptions: StatusOption[] = [
        { label: 'Recibida', value: 'RECEIVED', icon: 'pi pi-inbox', severity: 'info' },
        { label: 'En Progreso', value: 'IN_PROGRESS', icon: 'pi pi-spin pi-spinner', severity: 'warning' },
        { label: 'Esperando Pago', value: 'WAITING_PAYMENT', icon: 'pi pi-money-bill', severity: 'warning' },
        { label: 'Completada', value: 'COMPLETED', icon: 'pi pi-check', severity: 'success' },
        { label: 'Cancelada', value: 'CANCELLED', icon: 'pi pi-times', severity: 'danger' }
    ];

    /**
     * Calcula el total pagado en USD de una orden
     */
    getTotalPaidUSD(order: Order): number {
        if (!order.payments || order.payments.length === 0) {
            return 0;
        }

        // Si los pagos tienen amountUSD, usarlo directamente
        // De lo contrario, calcular desde amount y currency
        let totalPaid = 0;
        for (const payment of order.payments) {
            const paymentAny = payment as any;
            if (paymentAny.amountUSD !== undefined) {
                totalPaid += Number(paymentAny.amountUSD);
            } else if (payment.currency === 'USD') {
                totalPaid += payment.amount;
            } else {
                // Para VES, necesitaríamos el exchangeRate, pero si no está disponible,
                // asumimos que el pago ya está completo si existe
                // En este caso, usamos una aproximación conservadora
                const paymentAny = payment as any;
                if (paymentAny.exchangeRate) {
                    totalPaid += payment.amount / Number(paymentAny.exchangeRate);
                } else {
                    // Si no hay exchangeRate, no podemos calcular exactamente
                    // Esto no debería pasar ya que el backend siempre debería incluir exchangeRate
                    console.warn('Payment sin exchangeRate, usando aproximación conservadora');
                    totalPaid += payment.amount / 240; // Tasa de cambio por defecto (fallback)
                }
            }
        }
        return totalPaid;
    }

    /**
     * Verifica si una orden tiene pagos completos
     */
    isOrderFullyPaid(order: Order): boolean {
        const totalPaid = this.getTotalPaidUSD(order);
        const orderTotal = Number(order.totalAmount);
        // Permitir un pequeño margen para errores de punto flotante
        return totalPaid >= orderTotal - 0.01;
    }

    getStatusMenuItems(order: Order) {
        return this.statusOptions
            .filter(option => option.value !== order.status) // Excluir el estado actual
            .map(option => {
                const isCompletedDisabled = option.value === 'COMPLETED' && !this.isOrderFullyPaid(order);
                return {
                    label: isCompletedDisabled
                        ? `${option.label} (Requiere pago completo)`
                        : option.label,
                    icon: option.icon,
                    disabled: isCompletedDisabled,
                    command: () => {
                        if (option.value === 'CANCELLED') {
                            // Si es cancelar, emitir evento especial para abrir modal
                            this.onShowCancellationReason.emit(order);
                        } else {
                            this.onStatusChange.emit({ order, newStatus: option.value });
                        }
                    }
                };
            });
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

    getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
        const severityMap: { [key: string]: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined } = {
            'RECEIVED': 'info',
            'IN_PROGRESS': 'warning',
            'QUALITY_CHECK': 'info',
            'WAITING_PAYMENT': 'warning',
            'COMPLETED': 'success',
            'CANCELLED': 'danger'
        };
        return severityMap[status] || 'secondary';
    }
}

