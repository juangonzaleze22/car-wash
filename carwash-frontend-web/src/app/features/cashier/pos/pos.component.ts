import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, Validators, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { DividerModule } from 'primeng/divider';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import { GalleriaModule } from 'primeng/galleria';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { OrderDetailModalComponent } from '../../../shared/components/order-detail-modal/order-detail-modal.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-pos',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        CardModule,
        InputTextModule,
        ButtonModule,
        TableModule,
        TagModule,
        RadioButtonModule,
        ToastModule,
        DividerModule,
        AutoCompleteModule,
        DialogModule,
        GalleriaModule,
        OrderDetailModalComponent
    ],
    providers: [MessageService],
    templateUrl: './pos.component.html'
})
export class POSComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private http = inject(HttpClient);
    private messageService = inject(MessageService);
    private webSocketService = inject(WebSocketService);
    private exchangeRateService = inject(ExchangeRateService);

    paymentForm = this.fb.group({
        paymentMethod: ['CASH', Validators.required],
        currency: ['USD', Validators.required],
        amount: [null, [Validators.required, Validators.min(0.01)]],
        reference: ['']
    });

    // Orders waiting for payment
    waitingOrders = signal<any[]>([]);

    orderSuggestions = signal<any[]>([]);
    selectedOrder = signal<any | null>(null);
    processingPayment = signal(false);

    // Detail Dialog
    displayDetailDialog = signal(false);
    selectedOrderDetail = signal<any>(null);

    // Payment State
    exchangeRate = signal<number>(0); // Se obtendrá del servicio
    currentPayments = signal<any[]>([]);
    loadingExchangeRate = signal(true);

    // Computed values
    totalPaidUSD = signal<number>(0);
    remainingUSD = signal<number>(0);
    changeUSD = signal<number>(0);
    changeVES = signal<number>(0);

    paymentMethods = [
        { label: 'Efectivo', value: 'CASH' },
        { label: 'Tarjeta', value: 'CARD' },
        { label: 'Transferencia', value: 'TRANSFER' }
    ];

    currencies = [
        { label: 'USD', value: 'USD' },
        { label: 'VES', value: 'VES' }
    ];

    private socketSubscription: Subscription | undefined;

    ngOnInit() {
        // Cargar tasa de cambio actual
        this.loadExchangeRate();

        this.loadWaitingOrders();

        // Listen for real-time updates
        this.socketSubscription = this.webSocketService.listen<any>('orders:updated').subscribe((data) => {
            console.log('Order update received:', data);
            this.loadWaitingOrders();

            // If the updated order is the currently selected one and it's no longer waiting payment (e.g. cancelled or paid elsewhere), clear selection
            if (this.selectedOrder() && data.order && data.order.id === this.selectedOrder().id && data.order.status !== 'WAITING_PAYMENT') {
                this.selectedOrder.set(null);
                this.resetPaymentState();
                this.messageService.add({ severity: 'info', summary: 'Orden Actualizada', detail: 'El estado de la orden seleccionada ha cambiado.' });
            }
        });
    }

    loadExchangeRate() {
        this.loadingExchangeRate.set(true);
        this.exchangeRateService.getUSDExchangeRate().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.exchangeRate.set(response.data.average);
                } else {
                    // Si falla, usar tasa por defecto
                    this.exchangeRate.set(240);
                }
                this.loadingExchangeRate.set(false);
            },
            error: (err) => {
                console.error('Error al cargar tasa de cambio:', err);
                // Si falla, usar tasa por defecto
                this.exchangeRate.set(240);
                this.loadingExchangeRate.set(false);
            }
        });
    }

    ngOnDestroy() {
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
    }

    loadWaitingOrders() {
        this.http.get<any[]>('http://localhost:3000/api/orders/dashboard').subscribe({
            next: (allOrders) => {
                // Filter only orders waiting for payment
                const waiting = allOrders.filter(o => o.status === 'WAITING_PAYMENT');
                this.waitingOrders.set(waiting);
            },
            error: (err) => console.error('Error loading waiting orders', err)
        });
    }

    searchOrders(event: any) {
        const query = event.query.toLowerCase();
        const filtered = this.waitingOrders().filter(o =>
            o.vehicle?.plate?.toLowerCase().includes(query) ||
            o.vehicle?.client?.name?.toLowerCase().includes(query) ||
            o.id?.toString().includes(query)
        );
        this.orderSuggestions.set(filtered);
    }

    onOrderSelect(order: any) {
        if (order) {
            this.selectedOrder.set(order);
            this.resetPaymentState();
            this.calculateTotals();
        }
    }

    resetPaymentState() {
        this.currentPayments.set([]);
        this.paymentForm.reset({
            paymentMethod: 'CASH',
            currency: 'USD',
            amount: null
        });
        this.calculateTotals();
    }

    addPayment() {
        if (this.paymentForm.invalid) return;

        const formVal = this.paymentForm.value;
        const amount = Number(formVal.amount);

        if (!amount || amount <= 0) return;

        const payment = {
            amount: amount,
            currency: formVal.currency,
            method: formVal.paymentMethod,
            exchangeRate: this.exchangeRate(),
            reference: formVal.reference
        };

        this.currentPayments.update(payments => [...payments, payment]);
        this.calculateTotals();

        // Reset amount but keep method/currency
        this.paymentForm.patchValue({ amount: null });
    }

    removePayment(index: number) {
        this.currentPayments.update(payments => payments.filter((_, i) => i !== index));
        this.calculateTotals();
    }

    calculateTotals() {
        const order = this.selectedOrder();
        if (!order) return;

        let paidUSD = 0;
        for (const p of this.currentPayments()) {
            if (p.currency === 'USD') {
                paidUSD += p.amount;
            } else {
                paidUSD += p.amount / p.exchangeRate;
            }
        }

        this.totalPaidUSD.set(paidUSD);

        const total = Number(order.totalAmount);
        const remaining = Math.max(0, total - paidUSD);
        const change = Math.max(0, paidUSD - total);

        this.remainingUSD.set(remaining);
        this.changeUSD.set(change);
        this.changeVES.set(change * this.exchangeRate());
    }

    processPayment() {
        if (this.remainingUSD() > 0.01) { // Small tolerance
            this.messageService.add({ severity: 'warn', summary: 'Pago Incompleto', detail: 'El monto pagado no cubre el total.' });
            return;
        }

        if (this.selectedOrder()) {
            this.processingPayment.set(true);
            const order = this.selectedOrder();

            const payload = {
                payments: this.currentPayments()
            };

            this.http.post(`http://localhost:3000/api/orders/${order.uuid}/pay`, payload).subscribe({
                next: (result: any) => {
                    this.processingPayment.set(false);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Pago Exitoso',
                        detail: `Pago procesado correctamente`
                    });

                    // Clear selection (list reload is handled by socket event from backend)
                    this.selectedOrder.set(null);
                    this.resetPaymentState();
                },
                error: (err) => {
                    this.processingPayment.set(false);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: err.error?.error || 'Error al procesar el pago'
                    });
                }
            });
        }
    }

    getImageUrl(path: string): string {
        if (!path) return '';
        return `http://localhost:3000${path}`;
    }

    openImage(url: string) {
        window.open(url, '_blank');
    }

    showOrderDetail(order: any) {
        this.selectedOrderDetail.set(order);
        this.displayDetailDialog.set(true);
    }

    getWasherName(order: any): string {
        if (!order?.items || order.items.length === 0) return 'Por asignar';
        const washer = order.items[0].assignedWasher;
        return washer ? washer.username : 'Por asignar';
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'RECEIVED': return 'Recibido';
            case 'IN_PROGRESS': return 'En Proceso';
            case 'QUALITY_CHECK': return 'Control Calidad';
            case 'WAITING_PAYMENT': return 'Por Cobrar';
            case 'COMPLETED': return 'Completado';
            case 'CANCELLED': return 'Cancelado';
            default: return status;
        }
    }

    getSeverity(status: string): any {
        switch (status) {
            case 'RECEIVED': return 'info';
            case 'IN_PROGRESS': return 'warning';
            case 'QUALITY_CHECK': return 'help';
            case 'WAITING_PAYMENT': return 'success'; // Changed to success/warning
            case 'COMPLETED': return 'success';
            case 'CANCELLED': return 'danger';
            default: return 'info';
        }
    }

    cancelSelection() {
        this.selectedOrder.set(null);
        this.resetPaymentState();
    }
}
