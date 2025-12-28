import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calcula los KPIs de un lavador específico
 */
export const calculateWasherKPIs = async (washerId: string, startDate?: Date, endDate?: Date) => {
    const now = new Date();
    const startOfMonth = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfPeriod = endDate || now;

    // Ganancias totales (todas)
    const totalEarnings = await prisma.washerEarnings.aggregate({
        where: {
            washerId,
            status: { not: 'CANCELLED' },
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ganancias pendientes
    const pendingEarnings = await prisma.washerEarnings.aggregate({
        where: {
            washerId,
            status: 'PENDING',
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ganancias pagadas
    const paidEarnings = await prisma.washerEarnings.aggregate({
        where: {
            washerId,
            status: 'PAID',
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ganancias del período seleccionado
    const periodEarnings = await prisma.washerEarnings.aggregate({
        where: {
            washerId,
            status: { not: 'CANCELLED' },
            earnedAt: {
                gte: startOfMonth,
                lte: endOfPeriod,
            },
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ganancias del día actual (si no hay filtro de fecha)
    const dailyEarnings = await prisma.washerEarnings.aggregate({
        where: {
            washerId,
            status: { not: 'CANCELLED' },
            earnedAt: {
                gte: startOfDay,
                lte: endOfPeriod,
            },
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Órdenes completadas
    const completedOrders = await prisma.order.count({
        where: {
            items: {
                some: {
                    assignedWasherId: washerId,
                },
            },
            status: 'COMPLETED',
        },
    });

    // Promedio de ganancias por orden
    const avgEarningsPerOrder = totalEarnings._count.id > 0
        ? Number(totalEarnings._sum.commissionAmount || 0) / totalEarnings._count.id
        : 0;

    return {
        totalEarnings: Number(totalEarnings._sum.commissionAmount || 0),
        totalOrders: totalEarnings._count.id,
        pendingEarnings: Number(pendingEarnings._sum.commissionAmount || 0),
        pendingOrders: pendingEarnings._count.id,
        paidEarnings: Number(paidEarnings._sum.commissionAmount || 0),
        paidOrders: paidEarnings._count.id,
        monthlyEarnings: Number(periodEarnings._sum.commissionAmount || 0),
        monthlyOrders: periodEarnings._count.id,
        dailyEarnings: Number(dailyEarnings._sum.commissionAmount || 0),
        dailyOrders: dailyEarnings._count.id,
        completedOrders,
        avgEarningsPerOrder,
    };
};

/**
 * Calcula los KPIs del administrador
 */
export const calculateAdminKPIs = async (startDate?: Date, endDate?: Date) => {
    const now = new Date();
    const startOfMonth = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = startDate || new Date(now);
    if (!startDate) {
        startOfWeek.setDate(now.getDate() - 7);
    }
    const endOfPeriod = endDate || now;

    // Total de ganancias de todos los lavadores
    const totalWasherEarnings = await prisma.washerEarnings.aggregate({
        where: {
            status: { not: 'CANCELLED' },
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ganancias pendientes totales
    const totalPendingEarnings = await prisma.washerEarnings.aggregate({
        where: {
            status: 'PENDING',
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ingresos del período seleccionado (de órdenes completadas)
    const periodRevenue = await prisma.order.aggregate({
        where: {
            status: 'COMPLETED',
            closedAt: {
                gte: startOfMonth,
                lte: endOfPeriod,
            },
        },
        _sum: {
            totalAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ingresos del día (si no hay filtro de fecha)
    const dailyRevenue = await prisma.order.aggregate({
        where: {
            status: 'COMPLETED',
            closedAt: {
                gte: startOfDay,
                lte: endOfPeriod,
            },
        },
        _sum: {
            totalAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Total de órdenes
    const totalOrders = await prisma.order.count({
        where: {
            status: { not: 'CANCELLED' },
        },
    });

    // Órdenes completadas
    const completedOrders = await prisma.order.count({
        where: {
            status: 'COMPLETED',
        },
    });

    // Órdenes pendientes
    const pendingOrders = await prisma.order.count({
        where: {
            status: { in: ['RECEIVED', 'IN_PROGRESS', 'WAITING_PAYMENT'] },
        },
    });

    // Número de lavadores activos
    const activeWashers = await prisma.user.count({
        where: {
            role: 'WASHER',
            active: true,
        },
    });

    // Top 5 lavadores por ganancias
    const topWashers = await prisma.washerEarnings.groupBy({
        by: ['washerId'],
        where: {
            status: { not: 'CANCELLED' },
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
        orderBy: {
            _sum: {
                commissionAmount: 'desc',
            },
        },
        take: 5,
    });

    // Obtener información de los lavadores
    const washersInfo = await prisma.user.findMany({
        where: {
            id: { in: topWashers.map((w: any) => w.washerId) },
        },
        select: {
            id: true,
            username: true,
        },
    });

    const topWashersWithInfo = topWashers.map((washer: any) => {
        const washerInfo = washersInfo.find((w) => w.id === washer.washerId);
        return {
            washerId: washer.washerId,
            washerName: washerInfo?.username || 'Desconocido',
            totalEarnings: Number(washer._sum.commissionAmount || 0),
            totalOrders: washer._count.id,
        };
    });

    // Distribución de ganancias por estado
    const earningsByStatus = await prisma.washerEarnings.groupBy({
        by: ['status'],
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ganancias del período seleccionado
    const periodEarnings = await prisma.washerEarnings.aggregate({
        where: {
            status: { not: 'CANCELLED' },
            earnedAt: {
                gte: startOfWeek,
                lte: endOfPeriod,
            },
        },
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Ganancias netas del negocio (ingresos - gastos de lavadores)
    const periodWasherEarnings = await prisma.washerEarnings.aggregate({
        where: {
            status: { not: 'CANCELLED' },
            earnedAt: {
                gte: startOfMonth,
                lte: endOfPeriod,
            },
        },
        _sum: {
            commissionAmount: true,
        },
    });

    // Gastos del período seleccionado (usando startDate y endDate del filtro)
    const periodExpenses = await prisma.expense.aggregate({
        where: {
            createdAt: {
                gte: startDate || startOfMonth,
                lte: endOfPeriod,
            },
        },
        _sum: {
            amountUSD: true,
        },
        _count: {
            id: true,
        },
    });

    // Gastos totales (sin filtro de fecha)
    const totalExpenses = await prisma.expense.aggregate({
        _sum: {
            amountUSD: true,
        },
        _count: {
            id: true,
        },
    });

    // Gastos por categoría del período
    const expensesByCategory = await prisma.expense.groupBy({
        by: ['category'],
        where: {
            createdAt: {
                gte: startDate || startOfMonth,
                lte: endOfPeriod,
            },
        },
        _sum: {
            amountUSD: true,
        },
        _count: {
            id: true,
        },
    });

    const periodWasherEarningsAmount = Number(periodWasherEarnings._sum.commissionAmount || 0);
    const periodRevenueAmount = Number(periodRevenue._sum.totalAmount || 0);
    const periodExpensesAmount = Number(periodExpenses._sum.amountUSD || 0);
    const netProfit = periodRevenueAmount - periodWasherEarningsAmount - periodExpensesAmount;

    // Tiempo promedio de lavadores por orden (en minutos)
    // Primero, buscar todas las órdenes completadas en el período
    const allCompletedOrders = await prisma.order.findMany({
        where: {
            status: 'COMPLETED',
            closedAt: {
                gte: startOfMonth,
                lte: endOfPeriod,
            },
            items: {
                some: {
                    assignedWasherId: { not: null }
                }
            }
        },
        select: {
            id: true,
            duration: true,
            startedAt: true,
            closedAt: true,
            createdAt: true,
            items: {
                select: {
                    assignedWasherId: true,
                    serviceId: true,
                    service: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    });

    // Incluir todas las órdenes completadas - calcular tiempo usando diferentes métodos
    // 1. duration (si existe)
    // 2. startedAt y closedAt (si existen)
    // 3. createdAt y closedAt (como fallback si no hay startedAt)
    const ordersWithDuration = allCompletedOrders.filter(order => {
        // Si tiene duration, está bien
        if (order.duration !== null) return true;
        // Si tiene startedAt y closedAt, está bien
        if (order.startedAt !== null && order.closedAt !== null) return true;
        // Si tiene closedAt (y createdAt siempre existe), usar como fallback
        if (order.closedAt !== null) return true;
        // Si no tiene nada, excluir
        return false;
    });

    // Calcular tiempo promedio por lavador (general)
    const washerTimes = new Map<string, { totalMinutes: number; orderCount: number }>();
    
    // Calcular tiempo promedio por servicio y lavador
    const serviceWasherTimes = new Map<string, { totalMinutes: number; orderCount: number }>();
    // Key format: "serviceId::washerId" (usando :: como separador para evitar conflictos con UUIDs)
    
    let processedOrders = 0;
    let skippedOrders = 0;
    
    ordersWithDuration.forEach(order => {
        // Calcular duración usando diferentes métodos en orden de prioridad:
        // 1. startedAt y closedAt (más preciso - tiempo real de trabajo)
        // 2. duration (si existe y es mayor a 0)
        // 3. createdAt y closedAt (fallback - tiempo total desde creación)
        let durationMinutes: number | null = null;
        
        // Priorizar startedAt/closedAt porque duration puede estar redondeado a 0 para tiempos cortos
        if (order.startedAt && order.closedAt) {
            const durationMs = order.closedAt.getTime() - order.startedAt.getTime();
            // Usar minutos decimales para mayor precisión (no redondear)
            durationMinutes = durationMs / (1000 * 60);
        } else if (order.duration && order.duration > 0) {
            // Solo usar duration si es mayor a 0 (evitar usar 0 que puede ser un redondeo)
            durationMinutes = order.duration;
        } else if (order.closedAt && order.createdAt) {
            // Fallback: usar tiempo desde creación hasta cierre
            const durationMs = order.closedAt.getTime() - order.createdAt.getTime();
            // Usar minutos decimales para mayor precisión (no redondear)
            durationMinutes = durationMs / (1000 * 60);
        }
        
        // Aceptar cualquier tiempo mayor a 0 (incluso si es menos de 1 minuto)
        // Usar segundos para mayor precisión y convertir a minutos decimales
        // Asegurarse de que el tiempo sea positivo (mayor a 0 segundos)
        if (durationMinutes !== null && durationMinutes > 0) {
            let hasValidItems = false;
            order.items.forEach(item => {
                if (item.assignedWasherId) {
                    hasValidItems = true;
                    // Tiempo general por lavador (usar minutos decimales para precisión)
                    const current = washerTimes.get(item.assignedWasherId) || { totalMinutes: 0, orderCount: 0 };
                    washerTimes.set(item.assignedWasherId, {
                        totalMinutes: current.totalMinutes + durationMinutes!,
                        orderCount: current.orderCount + 1
                    });

                    // Tiempo por servicio y lavador
                    // Usar un separador que no esté en los UUIDs (::)
                    const key = `${item.serviceId}::${item.assignedWasherId}`;
                    const currentService = serviceWasherTimes.get(key) || { totalMinutes: 0, orderCount: 0 };
                    serviceWasherTimes.set(key, {
                        totalMinutes: currentService.totalMinutes + durationMinutes!,
                        orderCount: currentService.orderCount + 1
                    });
                }
            });
            if (hasValidItems) {
                processedOrders++;
            } else {
                skippedOrders++;
            }
        } else {
            skippedOrders++;
        }
    });

    // Calcular promedio general
    let avgTimePerOrder = 0;
    if (ordersWithDuration.length > 0) {
        const totalDuration = ordersWithDuration.reduce((sum, order) => {
            let durationMinutes: number = 0;
            // Priorizar startedAt/closedAt porque duration puede estar redondeado a 0
            if (order.startedAt && order.closedAt) {
                const durationMs = order.closedAt.getTime() - order.startedAt.getTime();
                // Usar minutos decimales para mayor precisión
                durationMinutes = durationMs / (1000 * 60);
            } else if (order.duration && order.duration > 0) {
                durationMinutes = order.duration;
            } else if (order.closedAt && order.createdAt) {
                // Fallback: usar tiempo desde creación hasta cierre
                const durationMs = order.closedAt.getTime() - order.createdAt.getTime();
                // Usar minutos decimales para mayor precisión
                durationMinutes = durationMs / (1000 * 60);
            }
            return sum + durationMinutes;
        }, 0);
        // Redondear solo el promedio final a 2 decimales
        avgTimePerOrder = Math.round((totalDuration / ordersWithDuration.length) * 100) / 100;
    }

    // Obtener información de TODOS los lavadores que tienen órdenes con tiempo
    // Incluir tanto los que tienen tiempo general como los que tienen tiempo por servicio específico
    const washerIdsWithTime = Array.from(washerTimes.keys());
    const washerIdsFromServiceTimes = Array.from(serviceWasherTimes.keys()).map(key => key.split('::')[1]);
    const allWasherIds = Array.from(new Set([...washerIdsWithTime, ...washerIdsFromServiceTimes]));
    
    let allWashersInfo: Array<{ id: string; username: string }> = [];
    if (allWasherIds.length > 0) {
        try {
            allWashersInfo = await prisma.user.findMany({
                where: {
                    id: { in: allWasherIds },
                },
                select: {
                    id: true,
                    username: true,
                },
            });
        } catch (error) {
            console.error(`[KPI] Error al buscar lavadores:`, error);
        }
    }

    // Obtener información de TODOS los servicios realizados (no solo los que tienen tiempo)
    // Primero obtener todos los serviceIds de todas las órdenes completadas
    const allServiceIds = Array.from(new Set(allCompletedOrders.flatMap(o => o.items.map(i => i.serviceId))));
    
    let allServicesInfo: Array<{ id: string; name: string }> = [];
    if (allServiceIds.length > 0) {
        try {
            allServicesInfo = await prisma.serviceCatalog.findMany({
                where: {
                    id: { in: allServiceIds },
                },
                select: {
                    id: true,
                    name: true,
                },
            });
        } catch (error) {
            console.error(`[KPI] Error al buscar servicios:`, error);
        }
    }

    // Tiempo promedio por lavador (general)
    const avgTimeByWasher = Array.from(washerTimes.entries()).map(([washerId, data]) => {
        const washerInfo = allWashersInfo.find(w => w.id === washerId);
        const avgTime = data.orderCount > 0 ? data.totalMinutes / data.orderCount : 0;
        return {
            washerId,
            washerName: washerInfo?.username || 'Desconocido',
            avgTimeMinutes: Math.round(avgTime * 100) / 100, // Redondear a 2 decimales
            totalOrders: data.orderCount
        };
    }).sort((a, b) => a.avgTimeMinutes - b.avgTimeMinutes); // Ordenar por tiempo promedio (menor a mayor)

    // Tiempo promedio por servicio y lavador
    const avgTimeByServiceAndWasher: Array<{
        serviceId: string;
        serviceName: string;
        washerId: string;
        washerName: string;
        avgTimeMinutes: number;
        totalOrders: number;
    }> = [];

    serviceWasherTimes.forEach((data, key) => {
        // Dividir por el separador :: que no está en los UUIDs
        const [serviceId, washerId] = key.split('::');
        const serviceInfo = allServicesInfo.find(s => s.id === serviceId);
        const washerInfo = allWashersInfo.find(w => w.id === washerId);
        
        // Debug: verificar si se encuentran los datos
        if (!serviceInfo) {
            console.warn(`[KPI] Servicio no encontrado para serviceId: ${serviceId}`);
        }
        if (!washerInfo) {
            console.warn(`[KPI] Lavador no encontrado para washerId: ${washerId}`);
        }
        
        if (serviceInfo && washerInfo && data.orderCount > 0) {
            // Calcular promedio con decimales para mayor precisión
            // Redondear a 2 decimales para evitar números muy largos
            const avgTime = data.totalMinutes / data.orderCount;
            avgTimeByServiceAndWasher.push({
                serviceId,
                serviceName: serviceInfo.name,
                washerId,
                washerName: washerInfo.username,
                avgTimeMinutes: Math.round(avgTime * 100) / 100, // Redondear a 2 decimales
                totalOrders: data.orderCount
            });
        }
    });

    // Calcular tiempo promedio por servicio (para comparación)
    const serviceAvgTimes = new Map<string, { totalMinutes: number; orderCount: number }>();
    avgTimeByServiceAndWasher.forEach(item => {
        const current = serviceAvgTimes.get(item.serviceId) || { totalMinutes: 0, orderCount: 0 };
        serviceAvgTimes.set(item.serviceId, {
            totalMinutes: current.totalMinutes + (item.avgTimeMinutes * item.totalOrders),
            orderCount: current.orderCount + item.totalOrders
        });
    });

    // Incluir TODOS los servicios realizados, incluso si no tienen tiempo registrado
    const serviceAverages = allServicesInfo.map(serviceInfo => {
        const timeData = serviceAvgTimes.get(serviceInfo.id);
        const avgTime = timeData && timeData.orderCount > 0 
            ? timeData.totalMinutes / timeData.orderCount 
            : 0;
        return {
            serviceId: serviceInfo.id,
            serviceName: serviceInfo.name,
            avgTimeMinutes: Math.round(avgTime * 100) / 100 // Redondear a 2 decimales
        };
    });

    // Estadísticas de SERVICIOS realizados por categoría de vehículo
    // Obtener todos los OrderItems de órdenes completadas en el período
    const completedOrdersWithItems = await prisma.order.findMany({
        where: {
            status: 'COMPLETED',
            closedAt: {
                gte: startOfMonth,
                lte: endOfPeriod,
            },
        },
        select: {
            id: true,
            vehicleId: true,
            totalAmount: true,
            items: {
                select: {
                    id: true,
                    serviceId: true,
                }
            }
        },
    });

    // Obtener información de vehículos y categorías
    const vehicleIds = [...new Set(completedOrdersWithItems.map((order: any) => order.vehicleId))];
    const vehiclesWithCategories = await prisma.vehicle.findMany({
        where: {
            id: { in: vehicleIds },
        },
        select: {
            id: true,
            categoryId: true,
            categoryRef: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    });

    // Crear un mapa de vehicleId -> categoría
    const vehicleCategoryMap = new Map<string, { categoryId: string; categoryName: string; categoryCode: string }>();
    vehiclesWithCategories.forEach(vehicle => {
        if (vehicle.categoryId && vehicle.categoryRef) {
            vehicleCategoryMap.set(vehicle.id, {
                categoryId: vehicle.categoryId,
                categoryName: vehicle.categoryRef.name,
                categoryCode: vehicle.categoryRef.code,
            });
        }
    });

    // Agrupar servicios por categoría de vehículo
    const categoryStats = new Map<string, { serviceCount: number; totalRevenue: number; categoryName: string; categoryCode: string }>();
    
    completedOrdersWithItems.forEach((order: any) => {
        const categoryInfo = vehicleCategoryMap.get(order.vehicleId);
        if (categoryInfo) {
            const categoryId = categoryInfo.categoryId;
            const current = categoryStats.get(categoryId) || {
                serviceCount: 0,
                totalRevenue: 0,
                categoryName: categoryInfo.categoryName,
                categoryCode: categoryInfo.categoryCode,
            };
            // Contar servicios (OrderItems) en esta orden
            const servicesInOrder = order.items.length;
            categoryStats.set(categoryId, {
                serviceCount: current.serviceCount + servicesInOrder,
                totalRevenue: current.totalRevenue + Number(order.totalAmount || 0),
                categoryName: current.categoryName,
                categoryCode: current.categoryCode,
            });
        }
    });

    const servicesByCategoryArray = Array.from(categoryStats.entries()).map(([categoryId, stats]) => ({
        categoryId,
        categoryName: stats.categoryName,
        categoryCode: stats.categoryCode,
        serviceCount: stats.serviceCount, // Cambiado de orderCount a serviceCount
        totalRevenue: Number(stats.totalRevenue.toFixed(2)),
        percentage: 0, // Se calculará en el frontend
    })).sort((a, b) => b.serviceCount - a.serviceCount); // Ordenar por cantidad de servicios (mayor a menor)

    return {
        // Ganancias de lavadores
        totalWasherEarnings: Number(totalWasherEarnings._sum.commissionAmount || 0),
        totalWasherOrders: totalWasherEarnings._count.id,
        totalPendingEarnings: Number(totalPendingEarnings._sum.commissionAmount || 0),
        totalPendingOrders: totalPendingEarnings._count.id,
        weeklyEarnings: Number(periodEarnings._sum.commissionAmount || 0),
        weeklyOrders: periodEarnings._count.id,
        
        // Ingresos
        monthlyRevenue: periodRevenueAmount,
        monthlyOrders: periodRevenue._count.id,
        dailyRevenue: Number(dailyRevenue._sum.totalAmount || 0),
        dailyOrders: dailyRevenue._count.id,
        
        // Gastos
        totalExpenses: Number(totalExpenses._sum.amountUSD || 0),
        totalExpensesCount: totalExpenses._count.id,
        periodExpenses: periodExpensesAmount,
        periodExpensesCount: periodExpenses._count.id,
        expensesByCategory: expensesByCategory.map((item: any) => ({
            category: item.category,
            total: Number(item._sum.amountUSD || 0),
            count: item._count.id,
        })),
        
        // Ganancias netas del negocio
        netProfit: netProfit,
        periodWasherEarnings: periodWasherEarningsAmount,
        
        // Órdenes
        totalOrders,
        completedOrders,
        pendingOrders,
        
        // Lavadores
        activeWashers,
        topWashers: topWashersWithInfo,
        
        // Tiempo promedio
        avgTimePerOrder: avgTimePerOrder,
        avgTimeByWasher: avgTimeByWasher,
        avgTimeByServiceAndWasher: avgTimeByServiceAndWasher,
        serviceAverages: serviceAverages,
        
        // Distribución
        earningsByStatus: earningsByStatus.map((e: any) => ({
            status: e.status,
            total: Number(e._sum.commissionAmount || 0),
            count: e._count.id,
        })),
        
        // Servicios por categoría de vehículo
        servicesByCategory: servicesByCategoryArray,
    };
};

