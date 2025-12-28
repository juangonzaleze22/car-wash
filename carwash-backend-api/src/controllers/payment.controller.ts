import { Request, Response } from 'express';
import * as PaymentService from '../services/payment.service';
import * as ExchangeRateService from '../services/exchange-rate.service';
import { z } from 'zod';
import { getIO } from '../socket';
import { AuthRequest } from '../middleware/auth.middleware';

const paymentItemSchema = z.object({
    amount: z.number().positive(),
    currency: z.enum(['USD', 'VES']),
    method: z.enum(['CASH', 'CARD', 'TRANSFER']),
    exchangeRate: z.number().positive().optional(), // Opcional, se obtendrá automáticamente si no se proporciona
    reference: z.string().nullish().transform(val => val === null || val === '' ? undefined : val),
});

const processPaymentSchema = z.object({
    payments: z.array(paymentItemSchema).min(1),
    changeAmount: z.number().optional(),
    changeCurrency: z.enum(['USD', 'VES']).optional(),
    changeMethod: z.enum(['CASH', 'TRANSFER']).optional(), // Cómo se entregó el vuelto
});

export const processPayment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = processPaymentSchema.parse(req.body);
        
        // Obtener tasa de cambio actual para validación de seguridad
        let currentExchangeRate: number | null = null;
        const hasVESPayments = data.payments.some(p => p.currency === 'VES');
        
        if (hasVESPayments) {
            try {
                const rates = await ExchangeRateService.getExchangeRates();
                currentExchangeRate = rates.usd.average;
            } catch (error) {
                console.error('Error al obtener tasa de cambio para pago:', error);
                return res.status(500).json({ 
                    error: 'No se pudo obtener la tasa de cambio actual. Por favor, intente nuevamente.' 
                });
            }
        }
        
        // Validar que todos los pagos en VES tengan exchangeRate y que coincida con la tasa actual
        // Procesar pagos para garantizar que todos tengan exchangeRate (TypeScript)
        const processedPayments: Array<{
            amount: number;
            currency: 'USD' | 'VES';
            method: 'CASH' | 'CARD' | 'TRANSFER';
            exchangeRate: number;
            reference?: string;
        }> = data.payments.map(p => {
            if (p.currency === 'VES') {
                if (!currentExchangeRate) {
                    throw new Error('No se pudo obtener la tasa de cambio para pagos en VES');
                }
                
                let finalExchangeRate: number;
                if (!p.exchangeRate) {
                    // Si no se proporciona, usar la tasa actual
                    finalExchangeRate = currentExchangeRate;
                } else {
                    // Validar que la tasa proporcionada coincida con la actual (seguridad)
                    const TOLERANCE_PERCENT = 2; // Tolerancia del 2% para diferencias menores
                    const tolerance = currentExchangeRate * (TOLERANCE_PERCENT / 100);
                    const difference = Math.abs(p.exchangeRate - currentExchangeRate);
                    
                    if (difference > tolerance) {
                        throw new Error(`La tasa de cambio proporcionada (${p.exchangeRate}) no coincide con la tasa actual (${currentExchangeRate.toFixed(2)}). Por favor, recargue la página e intente nuevamente.`);
                    }
                    // Usar la tasa actual para consistencia (redondeada a 2 decimales)
                    finalExchangeRate = Math.round(currentExchangeRate * 100) / 100;
                }
                
                return {
                    amount: p.amount,
                    currency: p.currency,
                    method: p.method,
                    exchangeRate: finalExchangeRate,
                    reference: p.reference
                };
            } else {
                // Para pagos en USD, exchangeRate siempre es 1
                return {
                    amount: p.amount,
                    currency: p.currency,
                    method: p.method,
                    exchangeRate: 1,
                    reference: p.reference
                };
            }
        });
        
        // Get cashier ID from authenticated user
        const cashierId = req.user?.id;
        const result = await PaymentService.processPayment(id, { ...data, payments: processedPayments }, cashierId);

        // Emit socket event
        try {
            getIO().emit('orders:updated', { type: 'PAYMENT', order: result.order });
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al procesar el pago' });
    }
};
// Force rebuild
