import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Obtiene datos históricos de ganancias diarias para gráficas
 */
export const getWasherEarningsChartData = async (washerId: string, startDate: Date, endDate: Date) => {
    // Obtener ganancias agrupadas por día
    const earnings = await prisma.washerEarnings.findMany({
        where: {
            washerId,
            status: { not: 'CANCELLED' },
            earnedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            earnedAt: true,
            commissionAmount: true,
            status: true,
        },
        orderBy: {
            earnedAt: 'asc',
        },
    });

    // Agrupar por día
    const dailyData: { [key: string]: { date: string; total: number; pending: number; paid: number; count: number } } = {};
    
    earnings.forEach(earning => {
        const date = new Date(earning.earnedAt).toISOString().split('T')[0];
        if (!dailyData[date]) {
            dailyData[date] = {
                date,
                total: 0,
                pending: 0,
                paid: 0,
                count: 0,
            };
        }
        const amount = Number(earning.commissionAmount);
        dailyData[date].total += amount;
        dailyData[date].count += 1;
        if (earning.status === 'PENDING') {
            dailyData[date].pending += amount;
        } else if (earning.status === 'PAID') {
            dailyData[date].paid += amount;
        }
    });

    // Convertir a arrays ordenados
    const dates = Object.keys(dailyData).sort();
    const totals = dates.map(date => dailyData[date].total);
    const pendings = dates.map(date => dailyData[date].pending);
    const paids = dates.map(date => dailyData[date].paid);
    const counts = dates.map(date => dailyData[date].count);

    return {
        dates,
        totals,
        pendings,
        paids,
        counts,
    };
};

/**
 * Determina el intervalo de agregación según el rango de fechas
 */
const getAggregationInterval = (startDate: Date, endDate: Date): 'day' | 'week' | 'month' => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return 'day';      // Hasta 7 días: por día
    if (diffDays <= 90) return 'week';    // Hasta 90 días: por semana
    return 'month';                        // Más de 90 días: por mes
};

/**
 * Obtiene la clave de agregación según el intervalo
 */
const getAggregationKey = (date: Date, interval: 'day' | 'week' | 'month'): string => {
    const d = new Date(date);
    if (interval === 'day') {
        return d.toISOString().split('T')[0];
    } else if (interval === 'week') {
        // Obtener el lunes de la semana
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    } else {
        // Por mes: YYYY-MM
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
};

/**
 * Obtiene datos históricos de ingresos y ganancias para gráficas del admin
 */
export const getAdminChartData = async (startDate: Date, endDate: Date) => {
    const interval = getAggregationInterval(startDate, endDate);
    // Ingresos diarios (de órdenes completadas)
    const orders = await prisma.order.findMany({
        where: {
            status: 'COMPLETED',
            closedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            closedAt: true,
            totalAmount: true,
        },
        orderBy: {
            closedAt: 'asc',
        },
    });

    // Ganancias diarias de lavadores
    const earnings = await prisma.washerEarnings.findMany({
        where: {
            status: { not: 'CANCELLED' },
            earnedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            earnedAt: true,
            commissionAmount: true,
        },
        orderBy: {
            earnedAt: 'asc',
        },
    });

    // Gastos de la empresa
    const expenses = await prisma.expense.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            createdAt: true,
            amountUSD: true,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    // Agrupar ingresos según el intervalo
    const revenueByPeriod: { [key: string]: number } = {};
    orders.forEach(order => {
        if (order.closedAt) {
            const key = getAggregationKey(new Date(order.closedAt), interval);
            revenueByPeriod[key] = (revenueByPeriod[key] || 0) + Number(order.totalAmount);
        }
    });

    // Agrupar ganancias según el intervalo
    const earningsByPeriod: { [key: string]: number } = {};
    earnings.forEach(earning => {
        const key = getAggregationKey(new Date(earning.earnedAt), interval);
        earningsByPeriod[key] = (earningsByPeriod[key] || 0) + Number(earning.commissionAmount);
    });

    // Agrupar órdenes según el intervalo
    const ordersByPeriod: { [key: string]: number } = {};
    orders.forEach(order => {
        if (order.closedAt) {
            const key = getAggregationKey(new Date(order.closedAt), interval);
            ordersByPeriod[key] = (ordersByPeriod[key] || 0) + 1;
        }
    });

    // Agrupar gastos según el intervalo
    const expensesByPeriod: { [key: string]: number } = {};
    expenses.forEach(expense => {
        const key = getAggregationKey(new Date(expense.createdAt), interval);
        expensesByPeriod[key] = (expensesByPeriod[key] || 0) + Number(expense.amountUSD);
    });

    // Obtener todos los períodos únicos
    const allPeriods = new Set<string>();
    Object.keys(revenueByPeriod).forEach(period => allPeriods.add(period));
    Object.keys(earningsByPeriod).forEach(period => allPeriods.add(period));
    Object.keys(ordersByPeriod).forEach(period => allPeriods.add(period));
    Object.keys(expensesByPeriod).forEach(period => allPeriods.add(period));
    
    // Rellenar períodos faltantes en el rango según el intervalo
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const key = getAggregationKey(new Date(currentDate), interval);
        allPeriods.add(key);
        
        if (interval === 'day') {
            currentDate.setDate(currentDate.getDate() + 1);
        } else if (interval === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }

    const periods = Array.from(allPeriods).sort();
    const revenues = periods.map(period => revenueByPeriod[period] || 0);
    const earningsData = periods.map(period => earningsByPeriod[period] || 0);
    const ordersData = periods.map(period => ordersByPeriod[period] || 0);
    const expensesData = periods.map(period => expensesByPeriod[period] || 0);
    
    // Calcular ganancias netas por período (ingresos - gastos lavadores - gastos empresa)
    const netProfitData = periods.map(period => {
        const revenue = revenueByPeriod[period] || 0;
        const washerExpenses = earningsByPeriod[period] || 0;
        const companyExpenses = expensesByPeriod[period] || 0;
        return revenue - washerExpenses - companyExpenses;
    });

    // Formatear fechas según el intervalo para mostrar en el frontend
    const formattedDates = periods.map(period => {
        if (interval === 'day') {
            return period; // Ya está en formato YYYY-MM-DD
        } else if (interval === 'week') {
            const d = new Date(period);
            return d.toISOString().split('T')[0]; // Mantener formato para frontend
        } else {
            // Para meses, convertir YYYY-MM a fecha del primer día del mes
            const [year, month] = period.split('-');
            return `${year}-${month}-01`;
        }
    });

    return {
        dates: formattedDates,
        revenues,
        earnings: earningsData,
        orders: ordersData,
        expenses: expensesData,
        netProfit: netProfitData,
        interval, // Informar al frontend qué intervalo se usó
    };
};

