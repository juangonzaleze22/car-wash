import { PrismaClient, WasherEarningStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface GetWasherEarningsParams {
    washerId?: string;
    orderId?: number;
    status?: WasherEarningStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}

/**
 * Obtiene las ganancias de los lavadores con filtros opcionales
 */
export const getWasherEarnings = async (params: GetWasherEarningsParams) => {
    const {
        washerId,
        orderId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 10,
    } = params;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (washerId) {
        where.washerId = washerId;
    }

    if (orderId) {
        where.orderId = orderId;
    }

    if (status) {
        where.status = status;
    }

    if (startDate || endDate) {
        where.earnedAt = {};
        if (startDate) {
            where.earnedAt.gte = startDate;
        }
        if (endDate) {
            where.earnedAt.lte = endDate;
        }
    }

    const total = await prisma.washerEarnings.count({ where });

    const earnings = await prisma.washerEarnings.findMany({
        where,
        include: {
            washer: {
                select: {
                    id: true,
                    username: true,
                    role: true,
                },
            },
            order: {
                include: {
                    vehicle: {
                        include: {
                            client: {
                                select: {
                                    name: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
            },
            orderItem: {
                include: {
                    service: {
                        select: {
                            name: true,
                            price: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            earnedAt: 'desc',
        },
        skip,
        take: limit,
    });

    return {
        earnings,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Obtiene el resumen de ganancias de un lavador específico
 */
export const getWasherEarningsSummary = async (washerId: string, startDate?: Date, endDate?: Date) => {
    const where: any = {
        washerId,
        status: { not: WasherEarningStatus.CANCELLED },
    };

    if (startDate || endDate) {
        where.earnedAt = {};
        if (startDate) {
            where.earnedAt.gte = startDate;
        }
        if (endDate) {
            where.earnedAt.lte = endDate;
        }
    }

    const [totalEarnings, pendingEarnings, paidEarnings, totalOrders] = await Promise.all([
        // Total ganado (incluyendo pagado y pendiente)
        prisma.washerEarnings.aggregate({
            where,
            _sum: {
                commissionAmount: true,
            },
        }),
        // Pendiente por pagar
        prisma.washerEarnings.aggregate({
            where: {
                ...where,
                status: WasherEarningStatus.PENDING,
            },
            _sum: {
                commissionAmount: true,
            },
        }),
        // Ya pagado
        prisma.washerEarnings.aggregate({
            where: {
                ...where,
                status: WasherEarningStatus.PAID,
            },
            _sum: {
                commissionAmount: true,
            },
        }),
        // Total de órdenes completadas
        prisma.washerEarnings.count({
            where,
        }),
    ]);

    return {
        totalEarnings: totalEarnings._sum.commissionAmount || 0,
        pendingEarnings: pendingEarnings._sum.commissionAmount || 0,
        paidEarnings: paidEarnings._sum.commissionAmount || 0,
        totalOrders,
    };
};

/**
 * Obtiene el resumen general de ganancias (para admin)
 */
export const getAllWashersEarningsSummary = async (startDate?: Date, endDate?: Date) => {
    const where: any = {
        status: { not: WasherEarningStatus.CANCELLED },
    };

    if (startDate || endDate) {
        where.earnedAt = {};
        if (startDate) {
            where.earnedAt.gte = startDate;
        }
        if (endDate) {
            where.earnedAt.lte = endDate;
        }
    }

    // Resumen total
    const totalSummary = await prisma.washerEarnings.aggregate({
        where,
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Resumen por lavador
    const earningsByWasher = await prisma.washerEarnings.groupBy({
        by: ['washerId'],
        where,
        _sum: {
            commissionAmount: true,
        },
        _count: {
            id: true,
        },
    });

    // Obtener información de los lavadores
    const washersInfo = await prisma.user.findMany({
        where: {
            id: { in: earningsByWasher.map((e: any) => e.washerId) },
            role: 'WASHER',
        },
        select: {
            id: true,
            username: true,
        },
    });

    const washersSummary = earningsByWasher.map((earning: any) => {
        const washer = washersInfo.find((w) => w.id === earning.washerId);
        return {
            washerId: earning.washerId,
            washerName: washer?.username || 'Desconocido',
            totalEarnings: Number(earning._sum.commissionAmount || 0),
            totalOrders: earning._count.id,
        };
    });

    return {
        totalEarnings: Number(totalSummary._sum.commissionAmount || 0),
        totalOrders: totalSummary._count.id,
        washersSummary: washersSummary.sort((a: any, b: any) => b.totalEarnings - a.totalEarnings),
    };
};

/**
 * Registra las ganancias cuando se completa una orden
 */
export const registerEarningsForCompletedOrder = async (orderId: number) => {
    // Obtener todos los items de la orden que tienen lavador asignado
    const orderItems = await prisma.orderItem.findMany({
        where: {
            orderId,
            assignedWasherId: { not: null },
        },
        include: {
            assignedWasher: true,
        },
    });

    if (orderItems.length === 0) {
        return []; // No hay items con lavador asignado
    }

    // Crear registros de ganancias para cada item
    const earnings = await Promise.all(
        orderItems.map(async (item) => {
            // Verificar si ya existe un registro de ganancia para este item
            const existing = await prisma.washerEarnings.findUnique({
                where: { orderItemId: item.id },
            });

            if (existing) {
                return existing; // Ya existe, no crear duplicado
            }

            // Crear nuevo registro de ganancia
            return await prisma.washerEarnings.create({
                data: {
                    orderItemId: item.id,
                    washerId: item.assignedWasherId!,
                    orderId: item.orderId,
                    commissionAmount: item.commissionAmount,
                    status: WasherEarningStatus.PENDING,
                },
                include: {
                    washer: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            });
        })
    );

    return earnings;
};

/**
 * Marca ganancias como pagadas
 */
export const markEarningsAsPaid = async (earningIds: string[], paidAt?: Date) => {
    // Obtener los IDs de los lavadores afectados antes de actualizar
    const earnings = await prisma.washerEarnings.findMany({
        where: {
            id: { in: earningIds },
            status: WasherEarningStatus.PENDING,
        },
        select: {
            washerId: true,
        },
    });

    const washerIds = [...new Set(earnings.map(e => e.washerId))];

    const result = await prisma.washerEarnings.updateMany({
        where: {
            id: { in: earningIds },
            status: WasherEarningStatus.PENDING,
        },
        data: {
            status: WasherEarningStatus.PAID,
            paidAt: paidAt || new Date(),
        },
    });

    // Emitir eventos de KPIs actualizados
    if (result.count > 0) {
        try {
            const { emitKPIsOnEarningsPaid } = await import('./kpi-emitter.service');
            await emitKPIsOnEarningsPaid(washerIds);
        } catch (error) {
            console.error('Error al emitir KPIs después de marcar como pagado:', error);
        }
    }

    return result;
};

/**
 * Cancela ganancias (por ejemplo, si se cancela una orden después de completada)
 */
export const cancelEarnings = async (orderId: number) => {
    const result = await prisma.washerEarnings.updateMany({
        where: {
            orderId,
            status: WasherEarningStatus.PENDING,
        },
        data: {
            status: WasherEarningStatus.CANCELLED,
        },
    });

    return result;
};

