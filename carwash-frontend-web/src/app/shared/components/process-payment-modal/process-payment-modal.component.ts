import { Component, inject, signal, input, output, OnInit, effect, computed, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, Validators, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';

import { CheckboxModule } from 'primeng/checkbox';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { VesCurrencyPipe } from '../../pipes/ves-currency.pipe';
import { UsdCurrencyPipe } from '../../pipes/usd-currency.pipe';

import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-process-payment-modal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        DialogModule,
        InputTextModule,
        ButtonModule,
        DividerModule,
        ToastModule,
        TooltipModule,
        DropdownModule,
        InputNumberModule,
        CheckboxModule,
        VesCurrencyPipe,
        UsdCurrencyPipe
    ],
    providers: [MessageService],
    templateUrl: './process-payment-modal.component.html'
})
export class ProcessPaymentModalComponent implements OnInit {
    private fb = inject(FormBuilder);
    private http = inject(HttpClient);
    private messageService = inject(MessageService);
    private exchangeRateService = inject(ExchangeRateService);

    // Inputs
    order = input<any | null>(null);
    visible = input.required<boolean>();

    // Outputs
    onClose = output<void>();
    onPaymentSuccess = output<any>();

    paymentForm = this.fb.group({
        paymentMethod: ['CASH', Validators.required],
        currency: ['USD', Validators.required],
        amount: [null, [Validators.required, Validators.min(0.01)]],
        reference: [''],
        confirmChange: [false],
        changeMethod: ['CASH'] // Por defecto efectivo, pero puede cambiarse a TRANSFER si no hay efectivo
    });

    // Payment State
    exchangeRate = signal<number>(0); // Se obtendrá del servicio
    currentPayments = signal<any[]>([]); // Pagos nuevos que se están agregando
    existingPayments = signal<any[]>([]); // Pagos existentes de la orden
    processingPayment = signal(false);
    loadingExchangeRate = signal(true);

    // Signal for checkbox value to ensure reactivity
    confirmChangeValue = toSignal(this.paymentForm.controls.confirmChange.valueChanges, { initialValue: false });

    // Signal for current currency to ensure reactivity
    currentCurrency = toSignal(this.paymentForm.controls.currency.valueChanges, { initialValue: 'USD' });

    // Signal for change method to ensure reactivity
    changeMethodValue = toSignal(this.paymentForm.controls.changeMethod.valueChanges, { initialValue: 'CASH' });

    // Getter for amount FormControl
    get amountControl() {
        return this.paymentForm.get('amount') as any;
    }

    // Helper to get amount in USD for display
    getAmountInUSD(amount: number, currency: string, exchangeRate: number): number {
        if (currency === 'USD') {
            return amount;
        }
        return amount / exchangeRate;
    }

    // Computed values
    totalPaidUSD = computed(() => {
        let paidUSD = 0;
        
        // Sumar pagos existentes
        for (const p of this.existingPayments()) {
            const paymentAny = p as any;
            if (paymentAny.amountUSD !== undefined) {
                paidUSD += Number(paymentAny.amountUSD);
            } else if (p.currency === 'USD') {
                paidUSD += p.amount;
            } else {
                const paymentAny = p as any;
                if (paymentAny.exchangeRate) {
                    paidUSD += p.amount / Number(paymentAny.exchangeRate);
                } else {
                    // Fallback si no hay exchangeRate
                    paidUSD += p.amount / 240;
                }
            }
        }
        
        // Sumar pagos nuevos que se están agregando
        for (const p of this.currentPayments()) {
            if (p.currency === 'USD') {
                paidUSD += p.amount;
            } else {
                paidUSD += p.amount / p.exchangeRate;
            }
        }
        
        // Round to 2 decimal places
        return Math.round(paidUSD * 100) / 100;
    });
    
    // Verificar si la orden ya está completamente pagada
    isOrderFullyPaid = computed(() => {
        const order = this.order();
        if (!order) return false;
        const orderTotal = Number(order.totalAmount);
        return this.totalPaidUSD() >= orderTotal - 0.01;
    });

    remainingUSD = computed(() => {
        const order = this.order();
        if (!order) return 0;
        const total = Number(order.totalAmount);
        const rem = total - this.totalPaidUSD();
        // Round to 2 decimal places
        return Math.max(0, Math.round(rem * 100) / 100);
    });

    changeUSD = computed(() => {
        const order = this.order();
        if (!order) return 0;
        const total = Number(order.totalAmount);
        const change = this.totalPaidUSD() - total;
        // Round to 2 decimal places
        return Math.max(0, Math.round(change * 100) / 100);
    });

    changeVES = computed(() => {
        return this.changeUSD() * this.exchangeRate();
    });

    paymentMethods = [
        { label: 'Efectivo', value: 'CASH' },
        { label: 'Tarjeta', value: 'CARD' },
        { label: 'Transferencia', value: 'TRANSFER' }
    ];

    currencies = [
        { label: 'USD', value: 'USD' },
        { label: 'VES', value: 'VES' }
    ];

    private _lastOrderId: any = null;
    private _wasVisible = false;

    constructor() {
        // Reset form when modal opens or order changes significantly
        effect(() => {
            const isVisible = this.visible();
            const currentOrder = this.order();
            const currentId = currentOrder?.id;

            untracked(() => {
                // Check if modal is just opening
                const isOpening = isVisible && !this._wasVisible;
                // Check if order ID changed while visible
                const isOrderChanged = currentId !== this._lastOrderId;

                if (isVisible && (isOpening || isOrderChanged)) {
                    this.resetPaymentState();
                }

                this._wasVisible = isVisible;
                this._lastOrderId = currentId;
            });
        }, { allowSignalWrites: true });
    }

    ngOnInit() {
        // Cargar tasa de cambio actual
        this.loadExchangeRate();
        
        // Initial setup
        this.resetPaymentState();

        // Reset amount when currency changes to avoid input issues
        this.paymentForm.get('currency')?.valueChanges.subscribe((newCurrency) => {
            // Reset amount before the component is recreated
            const currentAmount = this.paymentForm.get('amount')?.value;
            if (currentAmount !== null) {
                this.paymentForm.patchValue({ amount: null }, { emitEvent: false });
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

    resetPaymentState() {
        const order = this.order();
        
        // Cargar pagos existentes de la orden
        if (order && order.payments && order.payments.length > 0) {
            // Mapear los pagos existentes al formato esperado
            const existing = order.payments.map((p: any) => ({
                amount: Number(p.amount),
                currency: p.currency,
                method: p.method,
                exchangeRate: p.exchangeRate || this.exchangeRate(),
                amountUSD: p.amountUSD ? Number(p.amountUSD) : undefined,
                reference: p.reference,
                createdAt: p.createdAt,
                timestamp: p.createdAt ? new Date(p.createdAt) : new Date(),
                isExisting: true // Marcar como pago existente
            }));
            this.existingPayments.set(existing);
        } else {
            this.existingPayments.set([]);
        }
        
        // Resetear pagos nuevos
        this.currentPayments.set([]);
        this.paymentForm.reset({
            paymentMethod: 'CASH',
            currency: 'USD',
            amount: null,
            confirmChange: false,
            changeMethod: 'CASH'
        });
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
            reference: formVal.reference && formVal.reference.trim() !== '' ? formVal.reference.trim() : undefined,
            timestamp: new Date(),
            isExisting: false // Marcar como pago nuevo
        };

        this.currentPayments.update(payments => [...payments, payment]);

        // Reset amount but keep method/currency
        this.paymentForm.patchValue({ amount: null });
    }

    removePayment(index: number) {
        this.currentPayments.update(payments => payments.filter((_, i) => i !== index));
    }

    calculateTotals() {
        // Removed as we now use computed signals
    }

    processPayment() {
        if (this.remainingUSD() > 0.01) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Pago Incompleto',
                detail: 'El monto pagado no cubre el total.'
            });
            return;
        }

        const order = this.order();
        if (!order) return;

        this.processingPayment.set(true);

        // Prepare payload with payment details and change information
        const payload: any = {
            payments: this.currentPayments()
        };

        // Add change information if there's change to give
        const change = this.changeUSD();
        if (change > 0.01 && this.confirmChangeValue()) {
            // Determine change currency (use the last payment currency or default to USD)
            const lastPayment = this.currentPayments()[this.currentPayments().length - 1];
            payload.changeAmount = change;
            payload.changeCurrency = lastPayment?.currency === 'VES' ? 'VES' : 'USD';
            payload.changeMethod = this.changeMethodValue() || 'CASH'; // CASH o TRANSFER
        }

        this.http.post(`${environment.apiUrl}/orders/${order.uuid}/pay`, payload).subscribe({
            next: (result: any) => {
                this.processingPayment.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Pago Exitoso',
                    detail: 'Pago procesado correctamente'
                });
                this.onPaymentSuccess.emit(result);
                this.handleClose();
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

    canAddPayment(): boolean {
        const amount = this.paymentForm.get('amount')?.value;

        // Check if amount is valid (not null and greater than 0)
        // p-inputNumber returns a number directly or null
        const hasValidAmount = amount !== null && typeof amount === 'number' && amount > 0;

        // Check if payment method and currency are selected
        const hasPaymentMethod = !!this.paymentForm.get('paymentMethod')?.value;
        const hasCurrency = !!this.paymentForm.get('currency')?.value;

        return hasValidAmount && hasPaymentMethod && hasCurrency;
    }

    handleClose() {
        this.resetPaymentState();
        this.onClose.emit();
    }

    // Pipes para formateo de moneda
    private vesPipe = new VesCurrencyPipe();
    private usdPipe = new UsdCurrencyPipe();

    formatVES(amount: number): string {
        return this.vesPipe.transform(amount);
    }

    formatUSD(amount: number): string {
        return this.usdPipe.transform(amount);
    }
}

