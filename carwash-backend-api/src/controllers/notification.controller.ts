import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as NotificationService from '../services/notification.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/notifications
 * Obtener notificaciones del usuario autenticado (por rol)
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || !user.role) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const notifications = await NotificationService.getNotificationsByRole(user.role);
        res.json(notifications);
    } catch (error: any) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener las notificaciones' });
    }
};

/**
 * GET /api/client/notifications
 * Obtener notificaciones del cliente autenticado
 */
export const getClientNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        if (!clientId) {
            return res.status(401).json({ error: 'Cliente no autenticado' });
        }

        // Obtener notificaciones relacionadas con las órdenes del cliente
        const clientVehicles = await prisma.vehicle.findMany({
            where: { clientId },
            select: { id: true }
        });

        const vehicleIds = clientVehicles.map(v => v.id);

        const notifications = await prisma.notification.findMany({
            where: {
                role: null, // Solo notificaciones sin rol (para clientes)
                OR: [
                    {
                        orderId: {
                            not: null
                        },
                        order: {
                            vehicleId: {
                                in: vehicleIds
                            }
                        }
                    },
                    {
                        deliveryRequestId: {
                            not: null
                        },
                        deliveryRequest: {
                            clientId: clientId
                        }
                    },
                    {
                        orderId: null,
                        deliveryRequestId: null // Notificaciones globales sin orden ni solicitud
                    }
                ]
            },
            include: {
                order: {
                    select: {
                        id: true,
                        uuid: true,
                        vehicle: {
                            select: {
                                plate: true
                            }
                        }
                    }
                },
                deliveryRequest: {
                    select: {
                        id: true,
                        status: true,
                        vehicle: {
                            select: {
                                plate: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        res.json(notifications);
    } catch (error: any) {
        console.error('Error al obtener notificaciones del cliente:', error);
        res.status(500).json({ error: 'Error al obtener las notificaciones' });
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Marcar notificación como leída
 */
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const notification = await NotificationService.markAsRead(id);
        res.json(notification);
    } catch (error: any) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ error: 'Error al actualizar la notificación' });
    }
};

