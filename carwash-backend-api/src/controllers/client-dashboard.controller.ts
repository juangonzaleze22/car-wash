import { Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

/**
 * GET /api/client/dashboard
 * Obtener dashboard del cliente con historial, estado actual y KPIs
 */
export const getClientDashboard = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        if (!clientId) {
            return res.status(401).json({ error: 'Cliente no autenticado' });
        }

        // Obtener información del cliente
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                vehicles: {
                    include: {
                        categoryRef: {
                            select: {
                                id: true,
                                name: true,
                                code: true
                            }
                        },
                        orders: {
                            include: {
                                vehicle: {
                                    select: {
                                        id: true,
                                        plate: true
                                    }
                                },
                                items: {
                                    include: {
                                        service: true,
                                        assignedWasher: {
                                            select: {
                                                id: true,
                                                name: true,
                                                username: true
                                            }
                                        }
                                    }
                                },
                                payments: true
                            },
                            orderBy: {
                                createdAt: 'desc'
                            }
                        }
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Obtener todas las órdenes del cliente
        const allOrders = client.vehicles.flatMap(v => v.orders);

        // Todas las órdenes pendientes (no completadas ni canceladas)
        const pendingOrders = allOrders
            .filter(order =>
                order.status !== OrderStatus.COMPLETED &&
                order.status !== OrderStatus.CANCELLED
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(order => {
                try {
                    // Obtener lavadores únicos asignados a los items de esta orden
                    const washers = order.items
                        .filter(item => item.assignedWasher)
                        .map(item => item.assignedWasher!)
                        .filter((washer, index, self) =>
                            index === self.findIndex(w => w && washer && w.id === washer.id)
                        );

                    // Calcular tiempo transcurrido (solo si ya empezó)
                    const elapsedMinutes = order.startedAt
                        ? Math.max(0, Math.floor((new Date().getTime() - new Date(order.startedAt).getTime()) / (1000 * 60)))
                        : 0;

                    return {
                        id: order.id,
                        uuid: order.uuid,
                        plate: order.vehicle.plate,
                        status: order.status,
                        totalAmount: Number(order.totalAmount),
                        createdAt: order.createdAt,
                        startedAt: order.startedAt,
                        elapsedMinutes: elapsedMinutes,
                        washers: washers.map(w => ({
                            id: w.id,
                            name: w.name,
                            username: w.username
                        })),
                        services: order.items.map(item => ({
                            name: item.service.name,
                            price: Number(item.service.price),
                            assignedWasher: item.assignedWasher ? {
                                id: item.assignedWasher.id,
                                name: item.assignedWasher.name,
                                username: item.assignedWasher.username
                            } : null
                        }))
                    };
                } catch (error) {
                    console.error('Error processing order:', order.id, error);
                    // Retornar orden básica en caso de error
                    return {
                        id: order.id,
                        uuid: order.uuid,
                        plate: order.vehicle.plate,
                        status: order.status,
                        totalAmount: Number(order.totalAmount),
                        createdAt: order.createdAt,
                        startedAt: order.startedAt,
                        elapsedMinutes: 0,
                        washers: [],
                        services: order.items.map(item => ({
                            name: item.service.name,
                            price: Number(item.service.price),
                            assignedWasher: null
                        }))
                    };
                }
            });

        // Historial de órdenes completadas (últimas 10)
        const history = allOrders
            .filter(order => order.status === OrderStatus.COMPLETED)
            .slice(0, 10)
            .map(order => ({
                id: order.id,
                uuid: order.uuid,
                plate: order.vehicle.plate,
                vehicleId: order.vehicle.id,
                status: order.status,
                totalAmount: Number(order.totalAmount),
                createdAt: order.createdAt,
                completedAt: order.completedAt,
                services: order.items.map(item => ({
                    name: item.service.name,
                    price: Number(item.service.price)
                }))
            }));

        // KPIs
        const totalOrders = allOrders.filter(o => o.status === OrderStatus.COMPLETED).length;
        const totalSpent = allOrders
            .filter(o => o.status === OrderStatus.COMPLETED)
            .reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        // Vehículos del cliente
        const vehicles = client.vehicles.map(v => ({
            id: v.id,
            plate: v.plate,
            category: v.category,
            categoryRef: v.categoryRef ? {
                id: v.categoryRef.id,
                name: v.categoryRef.name,
                code: v.categoryRef.code
            } : null,
            notes: v.notes,
            totalOrders: v.orders.filter(o => o.status === OrderStatus.COMPLETED).length
        }));

        res.json({
            client: {
                id: client.id,
                name: client.name,
                phone: client.phone,
                type: client.type
            },
            pendingOrders,
            history,
            kpis: {
                totalOrders,
                totalSpent: Number(totalSpent.toFixed(2)),
                averageOrderValue: Number(averageOrderValue.toFixed(2))
            },
            vehicles
        });
    } catch (error: any) {
        console.error('Error getting client dashboard:', error);
        res.status(500).json({ error: error.message || 'Error al obtener el dashboard del cliente' });
    }
};

/**
 * GET /api/client/orders/:orderId
 * Obtener detalles de una orden específica del cliente
 */
export const getClientOrderDetails = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        const orderId = parseInt(req.params.orderId);

        if (!clientId) {
            return res.status(401).json({ error: 'Cliente no autenticado' });
        }

        // Verificar que la orden pertenece al cliente
        let order = await prisma.order.findFirst({
            where: {
                id: orderId,
                vehicle: {
                    clientId: clientId
                }
            },
            include: {
                vehicle: {
                    include: {
                        client: true
                    }
                },
                items: {
                    include: {
                        service: true,
                        assignedWasher: {
                            select: {
                                id: true,
                                name: true,
                                username: true
                            }
                        }
                    }
                },
                payments: {
                    include: {
                        cashier: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                supervisor: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Orden no encontrada o no pertenece a este cliente' });
        }

        // Verificar y completar automáticamente si está completamente pagada
        const { checkAndAutoCompleteOrder } = await import('../services/order.service');
        const wasCompleted = await checkAndAutoCompleteOrder(order.id);

        // Si se completó, recargar la orden para obtener el estado actualizado
        if (wasCompleted) {
            const reloadedOrder = await prisma.order.findFirst({
                where: {
                    id: orderId,
                    vehicle: {
                        clientId: clientId
                    }
                },
                include: {
                    vehicle: {
                        include: {
                            client: true
                        }
                    },
                    items: {
                        include: {
                            service: true,
                            assignedWasher: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true
                                }
                            }
                        }
                    },
                    payments: {
                        include: {
                            cashier: {
                                select: {
                                    id: true,
                                    username: true
                                }
                            }
                        }
                    },
                    supervisor: {
                        select: {
                            id: true,
                            name: true,
                            username: true
                        }
                    }
                }
            });

            // Si se encontró la orden recargada, usarla; si no, mantener la original
            if (reloadedOrder) {
                order = reloadedOrder;
            }
        }

        res.json({
            id: order.id,
            uuid: order.uuid,
            plate: order.vehicle.plate,
            status: order.status,
            totalAmount: Number(order.totalAmount),
            createdAt: order.createdAt,
            startedAt: order.startedAt,
            completedAt: order.completedAt,
            duration: order.duration,
            services: order.items.map(item => ({
                id: item.id,
                name: item.service.name,
                price: Number(item.service.price),
                commissionAmount: Number(item.commissionAmount),
                assignedWasher: item.assignedWasher ? {
                    name: item.assignedWasher.name,
                    username: item.assignedWasher.username
                } : null
            })),
            payments: order.payments.map(payment => ({
                amount: Number(payment.amount),
                currency: payment.currency,
                method: payment.method,
                exchangeRate: Number(payment.exchangeRate),
                amountUSD: Number(payment.amountUSD),
                reference: payment.reference,
                createdAt: payment.createdAt,
                cashier: payment.cashier ? {
                    username: payment.cashier.username
                } : null
            })),
            supervisor: order.supervisor ? {
                name: order.supervisor.name,
                username: order.supervisor.username
            } : null
        });
    } catch (error: any) {
        console.error('Error getting order details:', error);
        res.status(500).json({ error: error.message || 'Error al obtener los detalles de la orden' });
    }
};

/**
 * GET /api/client/services
 * Obtener catálogo de servicios activos (público para clientes)
 */
export const getClientServices = async (req: Request, res: Response) => {
    try {
        const categoryId = req.query.categoryId as string | undefined;

        const where: any = {
            active: true // Solo servicios activos
        };

        if (categoryId) {
            where.categoryTargetId = categoryId;
        }

        const services = await prisma.serviceCatalog.findMany({
            where,
            include: {
                categoryTargetRef: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json(services);
    } catch (error: any) {
        console.error('Error getting client services:', error);
        res.status(500).json({
            error: error.message || 'Error al obtener los servicios'
        });
    }
};

