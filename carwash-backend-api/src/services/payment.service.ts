import { PrismaClient, OrderStatus } from '@prisma/client';
import * as WasherService from './washer.service';

const prisma = new PrismaClient();

interface PaymentItemDTO {
    amount: number;
    currency: 'USD' | 'VES';
    method: 'CASH' | 'CARD' | 'TRANSFER';
    exchangeRate: number;
    reference?: string;
}

interface ProcessPaymentDTO {
    payments: PaymentItemDTO[];
    changeAmount?: number;
    changeCurrency?: 'USD' | 'VES';
    changeMethod?: 'CASH' | 'TRANSFER'; // Cómo se entregó el vuelto: efectivo o transferencia
    cashierId?: string;
}

export const processPayment = async (orderId: string, data: ProcessPaymentDTO, cashierId?: string) => {
    const { payments } = data;

    // Validate order exists and is ready for payment
    const order = await prisma.order.findUnique({
        where: { uuid: orderId },
        include: {
            vehicle: { include: { client: true } },
            items: { include: { service: true } },
        },
    });

    if (!order) {
        throw new Error('Orden no encontrada');
    }

    // Allow payment for any status except COMPLETED and CANCELLED
    if (order.status === OrderStatus.COMPLETED) {
        throw new Error('La orden ya está completada. No se puede procesar un pago adicional.');
    }
    
    if (order.status === OrderStatus.CANCELLED) {
        throw new Error('No se puede cobrar una orden cancelada');
    }

    // Get existing payments to calculate total paid
    const existingPayments = await prisma.payment.findMany({
        where: { orderId: order.id },
    });

    // Calculate total paid in USD (existing + new payments)
    let totalPaidUSD = 0;
    
    // Sum existing payments
    for (const existingPayment of existingPayments) {
        if (existingPayment.amountUSD) {
            totalPaidUSD += Number(existingPayment.amountUSD);
        } else if (existingPayment.currency === 'USD') {
            totalPaidUSD += Number(existingPayment.amount);
        } else {
            totalPaidUSD += Number(existingPayment.amount) / Number(existingPayment.exchangeRate);
        }
    }
    
    // Sum new payments
    for (const p of payments) {
        if (p.currency === 'USD') {
            totalPaidUSD += p.amount;
        } else {
            // Convert VES to USD
            totalPaidUSD += p.amount / p.exchangeRate;
        }
    }

    // Validate payment covers total (allow small margin for floating point errors)
    const orderTotal = Number(order.totalAmount);
    if (totalPaidUSD < orderTotal - 0.01) {
        throw new Error(`Monto insuficiente. Total: $${orderTotal}, Pagado: $${totalPaidUSD.toFixed(2)}`);
    }

    // Check if order is now fully paid
    const isFullyPaid = totalPaidUSD >= orderTotal - 0.01;
    const shouldAutoComplete = order.status === OrderStatus.WAITING_PAYMENT && isFullyPaid;

    // Create Payment records
    await prisma.$transaction(async (tx) => {
        for (const p of payments) {
            // Calculate amount in USD for easier KPI calculations
            const amountUSD = p.currency === 'USD' 
                ? p.amount 
                : p.amount / p.exchangeRate;

            await tx.payment.create({
                data: {
                    orderId: order.id,
                    amount: p.amount,
                    currency: p.currency,
                    method: p.method,
                    exchangeRate: p.exchangeRate,
                    amountUSD: amountUSD,
                    reference: p.reference,
                    cashierId: cashierId || data.cashierId || null,
                },
            });
        }

        // Actualizar campos relacionados con el pago
        const orderData: any = {
            paymentMethod: 'SPLIT', // Or keep the first one, or 'MIXED'
            changeAmount: data.changeAmount ? data.changeAmount : null,
            changeCurrency: data.changeCurrency || null,
            changeMethod: data.changeMethod || (data.changeAmount ? 'CASH' : null), // Por defecto CASH si hay vuelto pero no se especifica método
        };

        // Si la orden está en WAITING_PAYMENT y ahora está completamente pagada, completarla automáticamente
        if (shouldAutoComplete) {
            orderData.status = OrderStatus.COMPLETED;
            orderData.closedAt = new Date();
            if (!order.completedAt) {
                orderData.completedAt = new Date();
            }
        }

        // Si la orden tiene startedAt pero no duration, calcular el tiempo ahora
        if (order.startedAt && !order.duration) {
            const now = new Date();
            const durationMs = now.getTime() - order.startedAt.getTime();
            orderData.duration = Math.round(durationMs / (1000 * 60));
        }

        await tx.order.update({
            where: { id: order.id },
            data: orderData,
        });
    });

    // Registrar ganancias de los lavadores cuando se procesa el pago
    // Esto se hace al pagar, no al completar, porque las ganancias se basan en el pago recibido
    try {
        await WasherService.registerEarningsForCompletedOrder(order.id);
        
        // Emitir eventos de KPIs actualizados (afecta a lavadores involucrados)
        const { emitKPIsOnPaymentComplete } = await import('./kpi-emitter.service');
        await emitKPIsOnPaymentComplete(order.id);
        
        // Si la orden se completó automáticamente, también emitir KPIs de completado
        if (shouldAutoComplete) {
            const { emitKPIsOnOrderComplete } = await import('./kpi-emitter.service');
            await emitKPIsOnOrderComplete(order.id);
        }
    } catch (error) {
        // Log error but don't fail the payment process
        console.error('Error al registrar ganancias de lavadores:', error);
    }

    // Fetch updated order
    const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
            vehicle: { include: { client: true } },
            items: { include: { service: true } },
            payments: { include: { cashier: { select: { id: true, username: true, role: true } } } },
        },
    });

    return {
        order: updatedOrder,
        message: 'Pago procesado exitosamente',
    };
};
