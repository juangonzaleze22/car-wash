import { getIO } from '../socket';
import * as KPICalculator from './kpi-calculator.service';

/**
 * Emite eventos de KPIs actualizados a través de Socket.IO
 */
export const emitWasherKPIs = async (washerId: string) => {
    try {
        const io = getIO();
        const kpis = await KPICalculator.calculateWasherKPIs(washerId);
        
        // Emitir evento solo para el lavador específico (usando room)
        io.to(`washer:${washerId}`).emit('kpi:washer:updated', kpis);
        
        // También emitir a todos por si acaso (para debugging)
        io.emit('kpi:washer:updated', { washerId, ...kpis });
    } catch (error) {
        console.error('Error al emitir KPIs del lavador:', error);
    }
};

export const emitAdminKPIs = async () => {
    try {
        const io = getIO();
        const kpis = await KPICalculator.calculateAdminKPIs();
        
        // Emitir evento a todos los admins conectados (usando room)
        io.to('admin').emit('kpi:admin:updated', kpis);
        
        // También emitir a todos por si acaso (para debugging)
        io.emit('kpi:admin:updated', kpis);
    } catch (error) {
        console.error('Error al emitir KPIs del admin:', error);
    }
};

/**
 * Emite KPIs cuando se completa un pago (afecta a admin y lavadores involucrados)
 */
export const emitKPIsOnPaymentComplete = async (orderId: number) => {
    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // Obtener los lavadores involucrados en la orden
        const orderItems = await prisma.orderItem.findMany({
            where: {
                orderId,
                assignedWasherId: { not: null },
            },
            select: {
                assignedWasherId: true,
            },
        });

        const washerIds = orderItems
            .map(item => item.assignedWasherId)
            .filter((id): id is string => id !== null);

        // Emitir KPIs del admin
        await emitAdminKPIs();
        
        // Emitir KPIs para cada lavador involucrado
        for (const washerId of washerIds) {
            await emitWasherKPIs(washerId);
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error al emitir KPIs después del pago:', error);
    }
};

/**
 * Emite KPIs cuando se completa una orden (afecta a admin y lavadores involucrados)
 */
export const emitKPIsOnOrderComplete = async (orderId: number) => {
    // Es lo mismo que cuando se completa un pago, así que reutilizamos la función
    await emitKPIsOnPaymentComplete(orderId);
};

/**
 * Emite KPIs cuando se marcan ganancias como pagadas
 */
export const emitKPIsOnEarningsPaid = async (washerIds: string[]) => {
    try {
        // Emitir KPIs del admin
        await emitAdminKPIs();
        
        // Emitir KPIs para cada lavador afectado
        for (const washerId of washerIds) {
            await emitWasherKPIs(washerId);
        }
    } catch (error) {
        console.error('Error al emitir KPIs después de marcar como pagado:', error);
    }
};

