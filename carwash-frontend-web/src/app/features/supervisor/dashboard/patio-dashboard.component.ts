import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { GalleriaModule } from 'primeng/galleria';

import { TooltipModule } from 'primeng/tooltip';

import { WebSocketService } from '../../../core/services/websocket.service';
import { UserService, User } from '../../../core/services/user.service';
import { Subscription } from 'rxjs';
import { ListboxModule } from 'primeng/listbox';
import { FormsModule } from '@angular/forms';
import { ProcessPaymentModalComponent } from '../../../shared/components/process-payment-modal/process-payment-modal.component';
import { OrderDetailModalComponent } from '../../../shared/components/order-detail-modal/order-detail-modal.component';
import { CancelOrderModalComponent } from '../../../shared/components/cancel-order-modal/cancel-order-modal.component';
import { ElapsedTimePipe } from '../../../shared/pipes/elapsed-time.pipe';
import { MenuModule } from 'primeng/menu';
import { OverlayModule } from 'primeng/overlay';

@Component({
  selector: 'app-patio-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TagModule,
    DragDropModule,
    ToastModule,
    DialogModule,
    ButtonModule,
    DividerModule,
    GalleriaModule,
    TooltipModule,
    ListboxModule,
    FormsModule,
    ProcessPaymentModalComponent,
    OrderDetailModalComponent,
    CancelOrderModalComponent,
    ElapsedTimePipe,
    MenuModule,
    OverlayModule
  ],
  providers: [MessageService],
  templateUrl: './patio-dashboard.component.html'
})
export class PatioDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private webSocketService = inject(WebSocketService);
  private userService = inject(UserService);

  receivedOrders = signal<any[]>([]);
  inProgressOrders = signal<any[]>([]);
  readyOrders = signal<any[]>([]);
  washers = signal<User[]>([]);

  // Order detail dialog
  displayDetailDialog = signal(false);
  selectedOrderDetail = signal<any | null>(null);

  // Washer selection dialog
  displayWasherDialog = signal(false);
  selectedWasher = signal<User | null>(null);
  pendingAssignment = signal<{ order: any, targetStatus: string, event?: CdkDragDrop<any[]> } | null>(null);

  // Payment modal
  displayPaymentModal = signal(false);
  selectedOrderForPayment = signal<any | null>(null);

  // Cancel modal
  displayCancelModal = signal(false);
  selectedOrderForCancel = signal<any | null>(null);

  private socketSubscription: Subscription | undefined;
  private timerInterval: any = null;
  timerTick = signal(0); // Signal to force change detection

  constructor() { }

  ngOnInit() {
    this.loadOrders();
    this.loadWashers();

    // Start timer only when needed (when there are orders in progress)
    this.startTimerIfNeeded();

    // Listen for real-time updates

    // Listen for real-time updates
    this.socketSubscription = this.webSocketService.listen<any>('orders:updated').subscribe((data) => {
      console.log('Dashboard update received:', data);

      // Check if order status changed (especially from IN_PROGRESS to another status)
      const previousOrder = [...this.inProgressOrders(), ...this.receivedOrders(), ...this.readyOrders()]
        .find(o => o.id === data.order?.id);
      const wasInProgress = previousOrder?.status === 'IN_PROGRESS';
      const isNowInProgress = data.order?.status === 'IN_PROGRESS';

      this.loadOrders();

      // If order just left IN_PROGRESS, force timer update to show frozen time
      if (wasInProgress && !isNowInProgress) {
        // Force multiple updates to ensure the timer reflects the frozen time
        setTimeout(() => {
          this.timerTick.set(Date.now());
        }, 100);
        setTimeout(() => {
          this.timerTick.set(Date.now());
        }, 300);
        setTimeout(() => {
          this.timerTick.set(Date.now());
        }, 600);
      }

      // If we have a detail dialog open, we might want to update it too if it's the same order
      if (this.selectedOrderDetail() && data.order && data.order.id === this.selectedOrderDetail().id) {
        this.selectedOrderDetail.set(data.order);
      }
    });
  }

  ngOnDestroy() {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    // Clean up timer
    this.stopTimer();
  }

  startTimerIfNeeded() {
    // Only start timer if there are orders in progress and timer is not already running
    if (this.inProgressOrders().length > 0 && !this.timerInterval) {
      this.timerInterval = setInterval(() => {
        // Double-check that there are still orders in progress
        const currentInProgress = this.inProgressOrders();
        if (currentInProgress.length > 0) {
          // Verify all orders are actually in IN_PROGRESS status
          const allInProgress = currentInProgress.every(o => o.status === 'IN_PROGRESS');
          if (allInProgress) {
            this.timerTick.set(Date.now()); // Update signal to trigger change detection
          } else {
            // Some orders are not in progress, stop the timer
            this.stopTimer();
          }
        } else {
          // No orders in progress, stop the timer immediately
          this.stopTimer();
        }
      }, 1000);
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateOrderInState(updatedOrder: any) {
    // Debug: Log what we're receiving from backend
    console.log('Updating order in state:', {
      id: updatedOrder.id,
      status: updatedOrder.status,
      startedAt: updatedOrder.startedAt,
      completedAt: updatedOrder.completedAt,
      duration: updatedOrder.duration
    });

    // Update the order in the appropriate signal based on its status
    const allOrders = [
      ...this.receivedOrders(),
      ...this.inProgressOrders(),
      ...this.readyOrders()
    ];

    const existingOrderIndex = allOrders.findIndex(o => o.id === updatedOrder.id);

    if (existingOrderIndex !== -1) {
      // Remove from all arrays
      this.receivedOrders.update(orders => orders.filter(o => o.id !== updatedOrder.id));
      this.inProgressOrders.update(orders => orders.filter(o => o.id !== updatedOrder.id));
      this.readyOrders.update(orders => orders.filter(o => o.id !== updatedOrder.id));

      // Add to the correct array based on status
      if (updatedOrder.status === 'RECEIVED') {
        this.receivedOrders.update(orders => [...orders, updatedOrder]);
      } else if (updatedOrder.status === 'IN_PROGRESS') {
        this.inProgressOrders.update(orders => [...orders, updatedOrder]);
      } else if (updatedOrder.status === 'WAITING_PAYMENT') {
        this.readyOrders.update(orders => [...orders, updatedOrder]);
      }
    } else {
      // Order doesn't exist yet, add it to the appropriate array
      if (updatedOrder.status === 'RECEIVED') {
        this.receivedOrders.update(orders => [...orders, updatedOrder]);
      } else if (updatedOrder.status === 'IN_PROGRESS') {
        this.inProgressOrders.update(orders => [...orders, updatedOrder]);
      } else if (updatedOrder.status === 'WAITING_PAYMENT') {
        this.readyOrders.update(orders => [...orders, updatedOrder]);
      }
    }
  }

  loadOrders() {
    this.http.get<any[]>('http://localhost:3000/api/orders/dashboard').subscribe({
      next: (orders) => {
        // Save previous state before updating
        const previousInProgress = [...this.inProgressOrders()];
        const previousReceived = [...this.receivedOrders()];
        const previousReady = [...this.readyOrders()];
        const previousInProgressCount = previousInProgress.length;

        // Update orders
        const newReceived = orders.filter(o => o.status === 'RECEIVED');
        const newInProgress = orders.filter(o => o.status === 'IN_PROGRESS');
        const newReady = orders.filter(o => o.status === 'WAITING_PAYMENT');

        this.receivedOrders.set(newReceived);
        this.inProgressOrders.set(newInProgress);
        this.readyOrders.set(newReady);

        // Start or stop timer based on whether there are orders in progress
        // Always check and update timer state when orders change
        if (newInProgress.length > 0) {
          this.startTimerIfNeeded();
        } else {
          // Immediately stop timer when no orders are in progress
          this.stopTimer();
          // Force one final update to show frozen times
          this.timerTick.set(Date.now());
        }

        // Check if any order left IN_PROGRESS or changed status
        const orderLeftProgress = previousInProgressCount > 0 && newInProgress.length < previousInProgressCount;

        // Check if any order status changed
        const allPrevious = [...previousInProgress, ...previousReceived, ...previousReady];
        const statusChanged = orders.some(order => {
          const prevOrder = allPrevious.find(o => o.id === order.id);
          return prevOrder && prevOrder.status !== order.status;
        });

        // If an order left IN_PROGRESS or status changed, force timer update
        // This ensures the timer shows the correct frozen time immediately
        if (orderLeftProgress || statusChanged) {
          // Force multiple updates to ensure the timer reflects the new state
          setTimeout(() => {
            this.timerTick.set(Date.now());
          }, 50);
          setTimeout(() => {
            this.timerTick.set(Date.now());
          }, 200);
          setTimeout(() => {
            this.timerTick.set(Date.now());
          }, 500);
        }
      },
      error: (err) => console.error('Error loading orders', err)
    });
  }

  getElapsedTime(order: any): number {
    if (!order.startedAt) {
      return 0;
    }

    const started = new Date(order.startedAt).getTime();
    let endTime: number;

    // CRITICAL: Only count in real-time if order is EXACTLY in IN_PROGRESS status
    // This ensures the timer stops immediately when order leaves IN_PROGRESS
    const isInProgress = order.status === 'IN_PROGRESS';

    if (isInProgress) {
      // Only read timerTick when order is in progress to trigger updates
      this.timerTick();
      // Only use now() when order is actively in progress
      endTime = new Date().getTime();
    }
    // If order is NOT in progress, MUST use completedAt (frozen time)
    // NEVER use now() when order is not in progress - this prevents timer from counting
    else if (order.completedAt) {
      // Don't read timerTick here - we want frozen time, no updates
      // Use completedAt to show the time when order left IN_PROGRESS
      endTime = new Date(order.completedAt).getTime();
    }
    // Order is not in progress and doesn't have completedAt
    // This means the order never entered IN_PROGRESS or completedAt wasn't set yet
    // Return 0 to avoid showing incorrect time
    else {
      // If order was in progress but completedAt is missing, calculate from startedAt to now
      // But this should not happen if backend is working correctly
      // For safety, return 0
      return 0;
    }

    const elapsedSeconds = Math.floor((endTime - started) / 1000);
    return elapsedSeconds;
  }

  loadWashers() {
    this.userService.getWashers().subscribe({
      next: (washers) => this.washers.set(washers),
      error: (err) => console.error('Error loading washers', err)
    });
  }

  showOrderDetail(order: any) {
    this.selectedOrderDetail.set(order);
    this.displayDetailDialog.set(true);
  }

  openPaymentModal(order: any) {
    this.selectedOrderForPayment.set(order);
    this.displayPaymentModal.set(true);
  }

  closePaymentModal() {
    this.displayPaymentModal.set(false);
    this.selectedOrderForPayment.set(null);
  }

  onPaymentSuccess(result: any) {
    this.messageService.add({
      severity: 'success',
      summary: 'Pago Procesado',
      detail: 'El pago se procesó correctamente'
    });
    
    // Update the specific order in the list with the updated order from backend
    if (result && result.order) {
      const updatedOrder = result.order;
      this.receivedOrders.update(orders =>
        orders.map(order => order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order)
      );
      this.inProgressOrders.update(orders =>
        orders.map(order => order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order)
      );
      this.readyOrders.update(orders =>
        orders.map(order => order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order)
      );
      
      // If detail dialog is open for this order, update it too
      if (this.selectedOrderDetail() && this.selectedOrderDetail().id === updatedOrder.id) {
        this.selectedOrderDetail.set({ ...this.selectedOrderDetail(), ...updatedOrder });
      }
    }
    
    // Also reload all orders to ensure consistency
    this.loadOrders();
    this.closePaymentModal();
  }

  onDrop(event: CdkDragDrop<any[]>, targetStatus: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // If moving to IN_PROGRESS, show washer selection
    if (targetStatus === 'IN_PROGRESS') {
      const order = event.previousContainer.data[event.previousIndex];

      // Check if washer is already assigned
      if (this.getWasherName(order) !== 'Por asignar') {
        this.processDrop(event, targetStatus);
        return;
      }

      this.pendingAssignment.set({ order, targetStatus, event });
      this.selectedWasher.set(null);
      this.displayWasherDialog.set(true);
      return;
    }

    this.processDrop(event, targetStatus);
  }

  openAssignWasherDialog(order: any) {
    this.pendingAssignment.set({ order, targetStatus: order.status });
    this.selectedWasher.set(null);
    this.displayWasherDialog.set(true);
  }

  confirmWasherAssignment() {
    if (!this.selectedWasher()) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debe seleccionar un lavador' });
      return;
    }

    const pending = this.pendingAssignment();
    if (pending) {
      if (pending.event) {
        // It was a drag & drop action
        this.processDrop(pending.event, pending.targetStatus, this.selectedWasher()?.id);
      } else {
        // It was a direct assignment (button click)
        this.assignWasher(pending.order, pending.targetStatus, this.selectedWasher()?.id!);
      }
      this.displayWasherDialog.set(false);
      this.pendingAssignment.set(null);
    }
  }

  cancelWasherAssignment() {
    this.displayWasherDialog.set(false);
    this.pendingAssignment.set(null);
  }

  assignWasher(order: any, status: string, washerId: string) {
    const payload = { status, assignedWasherId: washerId };
    this.http.patch<any>(`http://localhost:3000/api/orders/${order.uuid}/status`, payload).subscribe({
      next: (updatedOrder) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Lavador Asignado',
          detail: `Se asignó el lavador a la orden ${order.vehicle?.plate}`
        });
        // Update the order in the local state with the response from backend
        this.updateOrderInState(updatedOrder);
        this.loadOrders(); // Reload to see changes
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo asignar el lavador'
        });
      }
    });
  }

  processDrop(event: CdkDragDrop<any[]>, targetStatus: string, assignedWasherId?: string) {
    const order = event.previousContainer.data[event.previousIndex];

    // Optimistic update
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // Update in backend
    const payload: any = { status: targetStatus };
    if (assignedWasherId) {
      payload.assignedWasherId = assignedWasherId;
    }

    this.http.patch<any>(`http://localhost:3000/api/orders/${order.uuid}/status`, payload).subscribe({
      next: (updatedOrder) => {
        // Debug: Log what we receive from backend
        console.log('Order updated from backend:', {
          id: updatedOrder.id,
          status: updatedOrder.status,
          startedAt: updatedOrder.startedAt,
          completedAt: updatedOrder.completedAt,
          duration: updatedOrder.duration
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Estado Actualizado',
          detail: `Orden ${order.vehicle?.plate} movida a ${this.getStatusLabel(targetStatus)}`
        });

        // Update the order in the local state with the response from backend
        // This ensures we have the correct completedAt/startedAt values immediately
        this.updateOrderInState(updatedOrder);

        // Reload all orders to ensure consistency (with a small delay to ensure backend has processed)
        setTimeout(() => {
          this.loadOrders();
        }, 100);

        // Force immediate timer updates after status change
        // Multiple updates ensure the timer reflects the new state correctly
        setTimeout(() => {
          this.timerTick.set(Date.now());
        }, 100);
        setTimeout(() => {
          this.timerTick.set(Date.now());
        }, 300);
        setTimeout(() => {
          this.timerTick.set(Date.now());
        }, 600);
      },
      error: (err) => {
        // Rollback on error
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estado'
        });
        // Reload to get correct state
        this.loadOrders();
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'RECEIVED': 'En Espera',
      'IN_PROGRESS': 'En Proceso',
      'WAITING_PAYMENT': 'Listo / Por Cobrar'
    };
    return labels[status] || status;
  }

  getSeverity(status: string): "success" | "secondary" | "info" | "warning" | "danger" | "contrast" | undefined {
    switch (status) {
      case 'RECEIVED': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'WAITING_PAYMENT': return 'success';
      default: return 'info';
    }
  }

  getImageUrl(imagePath: string): string {
    return `http://localhost:3000${imagePath}`;
  }

  // Status change menu items
  getStatusMenuItems(order: any) {
    const statusOptions = [
      { label: 'Recibida', value: 'RECEIVED', icon: 'pi pi-inbox' },
      { label: 'En Progreso', value: 'IN_PROGRESS', icon: 'pi pi-spin pi-spinner' },
      { label: 'Esperando Pago', value: 'WAITING_PAYMENT', icon: 'pi pi-money-bill' },
      { label: 'Completada', value: 'COMPLETED', icon: 'pi pi-check' },
      { label: 'Cancelada', value: 'CANCELLED', icon: 'pi pi-times' }
    ];

    return statusOptions
      .filter(option => option.value !== order.status)
      .map(option => ({
        label: option.label,
        icon: option.icon,
        command: () => {
          if (option.value === 'CANCELLED') {
            this.selectedOrderForCancel.set(order);
            this.displayCancelModal.set(true);
          } else {
            this.updateOrderStatus(order, option.value);
          }
        }
      }));
  }

  onStatusChange(event: { order: any; newStatus: string }) {
    const { order, newStatus } = event;

    if (newStatus === 'CANCELLED') {
      this.selectedOrderForCancel.set(order);
      this.displayCancelModal.set(true);
      return;
    }

    this.updateOrderStatus(order, newStatus);
  }

  confirmCancelOrder(event: { order: any; reason: string }) {
    const { order, reason } = event;
    this.updateOrderStatus(order, 'CANCELLED', reason);
    this.displayCancelModal.set(false);
    this.selectedOrderForCancel.set(null);
  }

  updateOrderStatus(order: any, newStatus: string, cancellationReason?: string) {
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
        this.loadOrders();
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

  showCancellationReason(order: any) {
    this.selectedOrderForCancel.set(order);
    this.displayCancelModal.set(true);
  }

  getWasherName(order: any): string {
    // Assuming the first item has the assigned washer, or we check items
    if (order.items && order.items.length > 0 && order.items[0].assignedWasher) {
      return order.items[0].assignedWasher.username;
    }
    return 'Por asignar';
  }

  /**
   * Calcula el total pagado en USD
   */
  getTotalPaidUSD(order: any): number {
    if (!order || !order.payments || order.payments.length === 0) {
      return 0;
    }
    
    let totalPaid = 0;
    for (const payment of order.payments) {
      // Priorizar amountUSD si está disponible (ya viene como número desde el backend)
      if (payment.amountUSD !== undefined && payment.amountUSD !== null) {
        totalPaid += Number(payment.amountUSD);
      } else if (payment.currency === 'USD') {
        // Si es USD directamente
        totalPaid += Number(payment.amount);
      } else {
        // Convertir de VES a USD usando exchangeRate
        const amount = Number(payment.amount);
        const exchangeRate = payment.exchangeRate ? Number(payment.exchangeRate) : null;
        if (exchangeRate && exchangeRate > 0) {
          totalPaid += amount / exchangeRate;
        } else {
          // Fallback a tasa por defecto
          totalPaid += amount / 240;
        }
      }
    }
    return totalPaid;
  }

  /**
   * Verifica si la orden está completamente pagada
   */
  isOrderFullyPaid(order: any): boolean {
    if (!order) return false;
    
    // Si no hay pagos, no está pagada
    if (!order.payments || order.payments.length === 0) {
      return false;
    }
    
    const totalPaid = this.getTotalPaidUSD(order);
    const orderTotal = Number(order.totalAmount) || 0;
    
    // Permitir un margen de error de 0.01 USD para comparaciones de punto flotante
    return totalPaid >= orderTotal - 0.01;
  }
}
