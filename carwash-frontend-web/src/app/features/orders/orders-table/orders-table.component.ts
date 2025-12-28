import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { PaginatorModule } from 'primeng/paginator';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProcessPaymentModalComponent } from '../../../shared/components/process-payment-modal/process-payment-modal.component';
import { OrderDetailModalComponent } from '../../../shared/components/order-detail-modal/order-detail-modal.component';
import { OrdersTableViewComponent } from '../../../shared/components/orders-table-view/orders-table-view.component';
import { OrdersCardsViewComponent } from '../../../shared/components/orders-cards-view/orders-cards-view.component';
import { PaginationWrapperComponent } from '../../../shared/components/pagination-wrapper/pagination-wrapper.component';
import { CancelOrderModalComponent } from '../../../shared/components/cancel-order-modal/cancel-order-modal.component';
import { UserService, User } from '../../../core/services/user.service';
import { Order, Pagination } from '../../../shared/interfaces/order.interface';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-orders-table',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        DropdownModule,
        DialogModule,
        ToastModule,
        ButtonModule,
        ProcessPaymentModalComponent,
        OrderDetailModalComponent,
        OrdersTableViewComponent,
        OrdersCardsViewComponent,
        PaginationWrapperComponent,
        CancelOrderModalComponent,
        ConfirmDialogModule
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './orders-table.component.html',
    styleUrl: './orders-table.component.css'
})
export class OrdersTableComponent implements OnInit, OnDestroy {
    private http = inject(HttpClient);
    private messageService = inject(MessageService);
    private userService = inject(UserService);
    private webSocketService = inject(WebSocketService);
    private confirmationService = inject(ConfirmationService);
    private authService = inject(AuthService);

    isAdmin = computed(() => this.authService.currentUser()?.role === 'ADMIN');

    orders = signal<Order[]>([]);
    pagination = signal<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    loading = signal(false);

    // Filters
    filters = signal({
        status: '',
        plate: '',
        clientName: '',
        supervisorId: '',
        washerId: '',
        vehicleCategory: '',
        serviceId: ''
    });

    // Options for dropdowns
    statusOptions = [
        { label: 'Todos', value: '' },
        { label: 'Recibida', value: 'RECEIVED' },
        { label: 'En Progreso', value: 'IN_PROGRESS' },
        { label: 'Control de Calidad', value: 'QUALITY_CHECK' },
        { label: 'Esperando Pago', value: 'WAITING_PAYMENT' },
        { label: 'Completada', value: 'COMPLETED' },
        { label: 'Cancelada', value: 'CANCELLED' }
    ];

    vehicleCategoryOptions = [
        { label: 'Todos', value: '' },
        { label: 'Auto', value: 'AUTO' },
        { label: 'SUV', value: 'SUV' },
        { label: 'Moto', value: 'MOTO' },
        { label: 'Pickup', value: 'PICKUP' },
        { label: 'Camión', value: 'CAMION' }
    ];

    supervisors = signal<User[]>([]);
    washers = signal<User[]>([]);
    services = signal<any[]>([]);

    // Computed options for dropdowns
    washerOptions = computed(() => {
        const washersList = this.washers();
        if (washersList.length === 0) return [];
        return [{ id: '', username: 'Todos' }, ...washersList];
    });

    serviceOptions = computed(() => {
        const servicesList = this.services();
        if (servicesList.length === 0) return [];
        return [{ id: '', name: 'Todos' }, ...servicesList];
    });

    // Detail dialog
    displayDetailDialog = signal(false);
    selectedOrder = signal<Order | null>(null);

    // Payment modal
    displayPaymentModal = signal(false);
    selectedOrderForPayment = signal<Order | null>(null);

    // Cancel modal
    displayCancelModal = signal(false);
    selectedOrderForCancel = signal<Order | null>(null);

    // Debounce subjects for text inputs
    private plateSearchSubject = new Subject<string>();
    private clientNameSearchSubject = new Subject<string>();
    private debounceSubscriptions: Subscription[] = [];

    private socketSubscription: Subscription | undefined;

    ngOnInit() {
        this.setupDebounce();
        this.loadOrders();
        this.loadSupervisors();
        this.loadWashers();
        this.loadServices();
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Escuchar actualizaciones de órdenes en tiempo real
        this.socketSubscription = this.webSocketService.listen<any>('orders:updated').subscribe((data: any) => {
            console.log('Orden actualizada recibida:', data);

            // Si hay una orden actualizada, recargar la lista
            if (data.order) {
                // Verificar si la orden actualizada está en la página actual
                const currentOrder = this.orders().find(o => o.id === data.order.id);
                if (currentOrder) {
                    // Si la orden está visible, recargar para obtener los datos actualizados
                    this.loadOrders();
                } else {
                    // Si la orden no está visible pero podría estar en los filtros aplicados,
                    // recargar para ver si debe aparecer
                    this.loadOrders();
                }
            }
        });
    }

    private setupDebounce() {
        // Debounce for plate input (500ms)
        const plateSub = this.plateSearchSubject.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(value => {
            this.filters.update(f => ({ ...f, plate: value }));
            this.pagination.update(p => ({ ...p, page: 1 })); // Reset to first page
            this.loadOrders();
        });
        this.debounceSubscriptions.push(plateSub);

        // Debounce for client name input (500ms)
        const clientSub = this.clientNameSearchSubject.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(value => {
            this.filters.update(f => ({ ...f, clientName: value }));
            this.pagination.update(p => ({ ...p, page: 1 })); // Reset to first page
            this.loadOrders();
        });
        this.debounceSubscriptions.push(clientSub);
    }

    ngOnDestroy() {
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
        // Unsubscribe from debounce subscriptions
        this.debounceSubscriptions.forEach(sub => sub.unsubscribe());
    }

    // Handler for text input changes (with debounce)
    onPlateInputChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.plateSearchSubject.next(value);
    }

    onClientNameInputChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.clientNameSearchSubject.next(value);
    }

    // Handler for dropdown changes (immediate)
    onFilterChange() {
        this.pagination.update(p => ({ ...p, page: 1 })); // Reset to first page
        this.loadOrders();
    }

    loadOrders() {
        this.loading.set(true);
        const params = new HttpParams()
            .set('page', this.pagination().page.toString())
            .set('limit', this.pagination().limit.toString())
            .set('status', this.filters().status || '')
            .set('plate', this.filters().plate || '')
            .set('clientName', this.filters().clientName || '')
            .set('supervisorId', this.filters().supervisorId || '')
            .set('washerId', this.filters().washerId || '')
            .set('vehicleCategory', this.filters().vehicleCategory || '')
            .set('serviceId', this.filters().serviceId || '');

        this.http.get<{ orders: Order[]; pagination: Pagination }>('http://localhost:3000/api/orders', { params })
            .subscribe({
                next: (response) => {
                    this.orders.set(response.orders);
                    this.pagination.set(response.pagination);
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

    loadSupervisors() {
        // Load supervisors - for now we'll leave it empty
        // You can add an endpoint to get supervisors if needed
        this.supervisors.set([]);
    }

    loadWashers() {
        this.userService.getWashers().subscribe({
            next: (washers) => this.washers.set(washers),
            error: (err) => console.error('Error loading washers', err)
        });
    }

    loadServices() {
        this.http.get<any[]>('http://localhost:3000/api/services').subscribe({
            next: (services) => this.services.set(services),
            error: (err) => console.error('Error loading services', err)
        });
    }

    onPageChange(event: any) {
        // PrimeNG paginator uses 0-based page index, we use 1-based
        const newPage = event.page + 1;
        const newLimit = event.rows;
        this.pagination.update(p => ({ ...p, page: newPage, limit: newLimit }));
        this.loadOrders();
    }

    applyFilters() {
        this.pagination.update(p => ({ ...p, page: 1 }));
        this.loadOrders();
    }

    clearFilters() {
        this.filters.set({
            status: '',
            plate: '',
            clientName: '',
            supervisorId: '',
            washerId: '',
            vehicleCategory: '',
            serviceId: ''
        });
        this.applyFilters();
    }


    showOrderDetail(order: Order) {
        this.selectedOrder.set(order);
        this.displayDetailDialog.set(true);
    }

    processPayment(order: Order) {
        this.selectedOrderForPayment.set(order);
        this.displayPaymentModal.set(true);
    }

    onPaymentSuccess(result: any) {
        // Actualizar la orden en la lista con los datos actualizados del backend
        if (result && result.order) {
            const updatedOrder = result.order;
            this.orders.update(orders =>
                orders.map(order =>
                    order.id === updatedOrder.id ? {
                        ...order,
                        ...updatedOrder,
                        payments: updatedOrder.payments || order.payments
                    } : order
                )
            );
        }
        // El socket también actualizará automáticamente, pero esto asegura una actualización inmediata
        this.displayPaymentModal.set(false);
        this.selectedOrderForPayment.set(null);
    }

    onPaymentClose() {
        this.displayPaymentModal.set(false);
        this.selectedOrderForPayment.set(null);
    }

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
            if (payment.amountUSD !== undefined) {
                totalPaid += Number(payment.amountUSD);
            } else if (payment.currency === 'USD') {
                totalPaid += payment.amount;
            } else {
                // Para VES, usar exchangeRate si está disponible
                if (payment.exchangeRate) {
                    totalPaid += payment.amount / Number(payment.exchangeRate);
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

    onStatusChange(event: { order: Order; newStatus: string }) {
        const { order, newStatus } = event;

        // Si el estado es CANCELLED, abrir modal de cancelación
        if (newStatus === 'CANCELLED') {
            this.selectedOrderForCancel.set(order);
            this.displayCancelModal.set(true);
            return;
        }

        // Validar que no se pueda cambiar a COMPLETED sin pagos completos
        if (newStatus === 'COMPLETED' && !this.isOrderFullyPaid(order)) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Pago Incompleto',
                detail: 'No se puede completar la orden sin haber realizado el pago completo. Por favor, procese el pago primero.'
            });
            return;
        }

        // Para otros estados, actualizar directamente
        this.updateOrderStatus(order, newStatus);
    }

    confirmCancelOrder(event: { order: Order; reason: string }) {
        const { order, reason } = event;
        this.updateOrderStatus(order, 'CANCELLED', reason);
        this.displayCancelModal.set(false);
        this.selectedOrderForCancel.set(null);
    }

    updateOrderStatus(order: Order, newStatus: string, cancellationReason?: string) {
        const body: any = { status: newStatus };
        if (cancellationReason) {
            body.cancellationReason = cancellationReason;
        }

        this.http.patch(`http://localhost:3000/api/orders/${order.uuid}/status`, body).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Éxito',
                    detail: `Estado de la orden #${order.id} actualizado a ${this.getStatusLabel(newStatus)}`
                });
                // No necesitamos recargar manualmente, el socket lo hará automáticamente
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'Error al actualizar el estado de la orden'
                });
            }
        });
    }

    showCancellationReason(order: Order) {
        this.selectedOrderForCancel.set(order);
        this.displayCancelModal.set(true);
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

    deleteOrder(order: Order) {
        this.confirmationService.confirm({
            message: `¿Estás seguro de que deseas eliminar la orden #${order.id} del vehículo ${order.vehicle.plate}? Esta acción no se puede deshacer.`,
            header: 'Confirmar Eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'No',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
                this.http.delete(`http://localhost:3000/api/orders/${order.uuid}`).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Éxito',
                            detail: `Orden #${order.id} eliminada correctamente`
                        });
                        // Recargar órdenes
                        this.loadOrders();
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Error al eliminar la orden'
                        });
                    }
                });
            }
        });
    }
}

