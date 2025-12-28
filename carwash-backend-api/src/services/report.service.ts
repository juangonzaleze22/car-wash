import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Report {
    period: string;
    startDate: string;
    endDate: string;
    summary: {
        totalRevenueUSD: number;
        totalRevenueVES: number;
        totalExpensesUSD?: number;
        totalWasherEarningsUSD?: number;
        netProfitUSD?: number;
        totalOrders: number;
        completedOrders: number;
        moneyToDeliverUSD: number;
        totalChangeUSD: number;
        totalChangeByMethod: {
            CASH: { USD: number; VES: number; totalUSD: number };
            CARD: { USD: number; VES: number; totalUSD: number };
            TRANSFER: { USD: number; VES: number; totalUSD: number };
        };
        moneyToDeliverByMethod: {
            CASH: { USD: number; VES: number; totalUSD: number };
            CARD: { USD: number; VES: number; totalUSD: number };
            TRANSFER: { USD: number; VES: number; totalUSD: number };
        };
    };
    paymentsByMethod: {
        CASH: { USD: number; VES: number; totalUSD: number };
        CARD: { USD: number; VES: number; totalUSD: number };
        TRANSFER: { USD: number; VES: number; totalUSD: number };
    };
    paymentsByCurrency: {
        USD: number;
        VES: number;
        totalUSD: number;
    };
    orders: Array<{
        id: number;
        uuid: string;
        plate: string;
        clientName: string;
        totalAmount: number;
        status: string;
        closedAt: string | null;
        changeAmount: number | null;
        changeCurrency: string | null;
        changeUSD: number;
        payments: Array<{
            amount: number;
            currency: string;
            method: string;
            amountUSD: number;
        }>;
        services: Array<{
            name: string;
            price: number;
        }>;
    }>;
    expenses?: Array<{
        id: string;
        description: string;
        amountUSD: number;
        category: string;
        createdAt: string;
    }>;
    washerEarnings?: Array<{
        id: string;
        washerName: string;
        orderId: number;
        commissionAmount: number;
        status: string;
        earnedAt: string;
    }>;
}

export const getDailyReport = async (startDate: Date, endDate: Date, period: string = 'custom', userRole?: string): Promise<Report> => {
    // Asegurar que las fechas estén en el inicio y fin del día
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Obtener órdenes del período (completadas o cerradas)
    const orders = await prisma.order.findMany({
        where: {
            closedAt: { gte: start, lte: end },
            status: { not: 'CANCELLED' }
        },
        include: {
            vehicle: {
                include: {
                    client: true
                }
            },
            items: {
                include: {
                    service: true
                }
            },
            payments: {
                include: {
                    cashier: {
                        select: {
                            username: true
                        }
                    }
                }
            }
        },
        orderBy: {
            closedAt: 'desc'
        }
    });

    // Obtener gastos del período
    const expenses = await prisma.expense.findMany({
        where: {
            createdAt: {
                gte: start,
                lte: end
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // Obtener ganancias de lavadores del período (solo las pagadas o pendientes, no canceladas)
    const washerEarningsList = await prisma.washerEarnings.findMany({
        where: {
            earnedAt: {
                gte: start,
                lte: end
            },
            status: { not: 'CANCELLED' }
        },
        include: {
            washer: {
                select: {
                    username: true
                }
            }
        },
        orderBy: {
            earnedAt: 'desc'
        }
    });

    const totalWasherEarningsUSD = washerEarningsList.reduce((sum, earning) => sum + Number(earning.commissionAmount), 0);

    // Calcular resumen
    let totalRevenueUSD = 0;
    let totalRevenueVES = 0;
    let totalExpensesUSD = 0;
    const paymentsByMethod = {
        CASH: { USD: 0, VES: 0, totalUSD: 0 },
        CARD: { USD: 0, VES: 0, totalUSD: 0 },
        TRANSFER: { USD: 0, VES: 0, totalUSD: 0 }
    };
    const paymentsByCurrency = {
        USD: 0,
        VES: 0,
        totalUSD: 0
    };

    // Procesar pagos
    orders.forEach(order => {
        order.payments.forEach(payment => {
            const amount = Number(payment.amount);
            const amountUSD = Number(payment.amountUSD);
            const currency = payment.currency;
            const method = payment.method as 'CASH' | 'CARD' | 'TRANSFER';

            // Por método de pago
            if (currency === 'USD') {
                paymentsByMethod[method].USD += amount;
            } else {
                paymentsByMethod[method].VES += amount;
            }
            paymentsByMethod[method].totalUSD += amountUSD;

            // Por moneda
            if (currency === 'USD') {
                paymentsByCurrency.USD += amount;
                totalRevenueUSD += amount;
            } else {
                paymentsByCurrency.VES += amount;
                totalRevenueVES += amount;
            }
            paymentsByCurrency.totalUSD += amountUSD;
        });
    });

    // Calcular gastos
    expenses.forEach(expense => {
        totalExpensesUSD += Number(expense.amountUSD);
    });

    // Calcular vuelto total entregado (en USD)
    let totalChangeUSD = 0;
    let totalChangeByMethod = {
        CASH: { USD: 0, VES: 0, totalUSD: 0 },
        CARD: { USD: 0, VES: 0, totalUSD: 0 },
        TRANSFER: { USD: 0, VES: 0, totalUSD: 0 }
    };

    // Calcular tasa de cambio promedio para conversión de vuelto en VES
    let vesPaymentsCount = 0;
    let vesExchangeRateSum = 0;
    orders.forEach(order => {
        order.payments.forEach(payment => {
            if (payment.currency === 'VES') {
                vesPaymentsCount++;
                vesExchangeRateSum += Number(payment.exchangeRate);
            }
        });
    });
    
    // Obtener tasa actual si no hay pagos en VES en el período
    let averageExchangeRate = 240; // Tasa por defecto (fallback)
    if (vesPaymentsCount > 0) {
        averageExchangeRate = vesExchangeRateSum / vesPaymentsCount;
    } else {
        // Intentar obtener tasa actual del servicio
        try {
            const { getExchangeRates } = await import('./exchange-rate.service');
            const rates = await getExchangeRates();
            averageExchangeRate = rates.usd.average;
        } catch (error) {
            console.error('Error al obtener tasa de cambio para reporte:', error);
            // Usar tasa por defecto si falla
        }
    }

    // Procesar vuelto de cada orden
    // El vuelto puede entregarse en efectivo (CASH) o por transferencia (TRANSFER)
    // Si es en efectivo: se descuenta del efectivo en caja
    // Si es por transferencia: NO se descuenta del efectivo, pero sí del total (es una transferencia saliente)
    orders.forEach(order => {
        const changeAmountNum = order.changeAmount ? Number(order.changeAmount) : 0;
        if (changeAmountNum > 0) {
            const changeAmount = changeAmountNum;
            const changeCurrency = order.changeCurrency;
            const changeMethod = order.changeMethod || 'CASH'; // Por defecto CASH si no se especifica
            
            let changeUSD = 0;
            
            // Calcular el vuelto en USD
            if (changeCurrency === 'USD') {
                changeUSD = changeAmount;
            } else if (changeCurrency === 'VES') {
                // Convertir VES a USD usando la tasa de cambio
                let orderExchangeRate = averageExchangeRate;
                const orderVesPayments = order.payments.filter(p => p.currency === 'VES');
                if (orderVesPayments.length > 0) {
                    const orderVesRateSum = orderVesPayments.reduce((sum, p) => sum + Number(p.exchangeRate), 0);
                    orderExchangeRate = orderVesRateSum / orderVesPayments.length;
                }
                changeUSD = changeAmount / orderExchangeRate;
            }
            
            // Acumular el vuelto total en USD para el cálculo general (siempre se descuenta del total)
            totalChangeUSD += changeUSD;
            
            // Según el método de entrega, descontar del lugar correspondiente
            if (changeMethod === 'CASH') {
                // Vuelto entregado en efectivo: se descuenta del efectivo en caja
                if (changeCurrency === 'USD') {
                    totalChangeByMethod.CASH.USD += changeAmount;
                } else if (changeCurrency === 'VES') {
                    totalChangeByMethod.CASH.VES += changeAmount;
                }
                totalChangeByMethod.CASH.totalUSD += changeUSD;
            } else if (changeMethod === 'TRANSFER') {
                // Vuelto entregado por transferencia: NO se descuenta del efectivo
                // Se registra como transferencia saliente (se descuenta del total pero no del efectivo)
                if (changeCurrency === 'USD') {
                    totalChangeByMethod.TRANSFER.USD += changeAmount;
                } else if (changeCurrency === 'VES') {
                    totalChangeByMethod.TRANSFER.VES += changeAmount;
                }
                totalChangeByMethod.TRANSFER.totalUSD += changeUSD;
            }
        }
    });

    const netProfitUSD = paymentsByCurrency.totalUSD - totalExpensesUSD - totalWasherEarningsUSD;
    // Dinero a entregar es el total recaudado MENOS el vuelto entregado (sin descontar ganancias de lavadores)
    const moneyToDeliverUSD = paymentsByCurrency.totalUSD - totalChangeUSD;
    
    // Desglose de dinero a entregar por método de pago (restando el vuelto entregado)
    // IMPORTANTE: 
    // - Si el vuelto fue entregado en efectivo (CASH): se descuenta del efectivo en caja
    // - Si el vuelto fue entregado por transferencia (TRANSFER): NO se descuenta del efectivo,
    //   pero sí se descuenta del total de transferencias (es una transferencia saliente)
    const moneyToDeliverByMethod = {
        CASH: { 
            // Descontar solo el vuelto entregado en efectivo del efectivo recibido
            // Si el vuelto fue por transferencia, NO se descuenta aquí
            USD: Math.max(0, paymentsByMethod.CASH.USD - totalChangeByMethod.CASH.USD), 
            VES: Math.max(0, paymentsByMethod.CASH.VES - totalChangeByMethod.CASH.VES), 
            totalUSD: Math.max(0, paymentsByMethod.CASH.totalUSD - totalChangeByMethod.CASH.totalUSD)
        },
        CARD: { 
            // Tarjeta: NO se puede dar vuelto, por lo que el total pagado es igual al dinero a entregar
            USD: paymentsByMethod.CARD.USD, 
            VES: paymentsByMethod.CARD.VES, 
            totalUSD: paymentsByMethod.CARD.totalUSD 
        },
        TRANSFER: { 
            // Transferencia: Descontar el vuelto entregado por transferencia (transferencia saliente)
            // El vuelto por transferencia reduce el dinero que va a cuenta bancaria
            USD: Math.max(0, paymentsByMethod.TRANSFER.USD - totalChangeByMethod.TRANSFER.USD), 
            VES: Math.max(0, paymentsByMethod.TRANSFER.VES - totalChangeByMethod.TRANSFER.VES), 
            totalUSD: Math.max(0, paymentsByMethod.TRANSFER.totalUSD - totalChangeByMethod.TRANSFER.totalUSD)
        }
    };

    // Formatear órdenes para el reporte
    const formattedOrders = orders.map(order => {
        // Calcular vuelto en USD para esta orden
        let changeUSD = 0;
        const changeAmountNum = order.changeAmount ? Number(order.changeAmount) : 0;
        if (changeAmountNum > 0) {
            const changeAmount = changeAmountNum;
            const changeCurrency = order.changeCurrency;
            
            if (changeCurrency === 'USD') {
                changeUSD = changeAmount;
            } else {
                // Convertir VES a USD usando la tasa de cambio de los pagos de la orden
                let orderExchangeRate = averageExchangeRate;
                const orderVesPayments = order.payments.filter(p => p.currency === 'VES');
                if (orderVesPayments.length > 0) {
                    const orderVesRateSum = orderVesPayments.reduce((sum, p) => sum + Number(p.exchangeRate), 0);
                    orderExchangeRate = orderVesRateSum / orderVesPayments.length;
                }
                changeUSD = changeAmount / orderExchangeRate;
            }
        }

        return {
            id: order.id,
            uuid: order.uuid,
            plate: order.vehicle.plate,
            clientName: order.vehicle.client.name,
            totalAmount: Number(order.totalAmount),
            status: order.status,
            closedAt: order.closedAt?.toISOString() || null,
            changeAmount: order.changeAmount ? Number(order.changeAmount) : null,
            changeCurrency: order.changeCurrency || null,
            changeMethod: order.changeMethod || null,
            changeUSD: changeUSD,
            payments: order.payments.map(p => ({
                amount: Number(p.amount),
                currency: p.currency,
                method: p.method,
                amountUSD: Number(p.amountUSD)
            })),
            services: order.items.map(item => ({
                name: item.service.name,
                price: Number(item.service.price)
            }))
        };
    });

    // Formatear gastos
    const formattedExpenses = expenses.map(expense => ({
        id: expense.id,
        description: expense.description,
        amountUSD: Number(expense.amountUSD),
        category: expense.category,
        createdAt: expense.createdAt.toISOString()
    }));

    // Formatear ganancias de lavadores
    const formattedWasherEarnings = washerEarningsList.map(earning => ({
        id: earning.id,
        washerName: earning.washer.username,
        orderId: earning.orderId,
        commissionAmount: Number(earning.commissionAmount),
        status: earning.status,
        earnedAt: earning.earnedAt.toISOString(),
    }));

    const isAdmin = userRole === 'ADMIN';
    
    return {
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        summary: {
            totalRevenueUSD,
            totalRevenueVES,
            ...(isAdmin && {
                totalExpensesUSD,
                totalWasherEarningsUSD,
                netProfitUSD,
            }),
            totalOrders: orders.length,
            completedOrders: orders.filter(o => o.status === 'COMPLETED').length,
            moneyToDeliverUSD,
            totalChangeUSD,
            totalChangeByMethod,
            moneyToDeliverByMethod,
        },
        paymentsByMethod,
        paymentsByCurrency,
        orders: formattedOrders,
        ...(isAdmin && {
            expenses: formattedExpenses,
            washerEarnings: formattedWasherEarnings,
        }),
    };
};

export const getReport = async (period: string, customStartDate?: Date, customEndDate?: Date, userRole?: string): Promise<Report> => {
    const now = new Date();
    let startOfPeriod: Date;
    let endOfPeriod: Date;

    switch (period) {
        case 'today':
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
        case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            startOfPeriod = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            endOfPeriod = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
            break;
        case 'week':
            startOfPeriod = new Date(now);
            startOfPeriod.setDate(now.getDate() - 6); // Últimos 7 días incluyendo hoy
            startOfPeriod.setHours(0, 0, 0, 0);
            endOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
        case 'month':
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
            endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'year':
            startOfPeriod = new Date(now.getFullYear(), 0, 1);
            endOfPeriod = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        case 'custom':
            if (!customStartDate || !customEndDate) {
                throw new Error('Fechas de inicio y fin personalizadas son requeridas');
            }
            startOfPeriod = new Date(customStartDate);
            startOfPeriod.setHours(0, 0, 0, 0);
            endOfPeriod = new Date(customEndDate);
            endOfPeriod.setHours(23, 59, 59, 999);
            break;
        default:
            throw new Error('Período de reporte inválido');
    }

    return getDailyReport(startOfPeriod, endOfPeriod, period, userRole);
};

