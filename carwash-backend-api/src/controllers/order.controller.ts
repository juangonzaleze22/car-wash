import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as OrderService from '../services/order.service';
import { z } from 'zod';
import { getIO } from '../socket';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const smartCheckInSchema = z.object({
    plate: z.string().min(1),
    clientPhone: z.string().optional(),
    clientName: z.string().optional(),
    vehicleType: z.string().optional(), // Ahora acepta cualquier string, no solo enum estático
    categoryId: z.string().uuid().optional(), // Preferido: usar categoryId
    services: z.array(z.string()).min(1),
    supervisorId: z.string().uuid(),
    assignedWasherId: z.string().uuid().optional(),
}).refine((data) => {
    // Al menos uno de vehicleType o categoryId debe estar presente
    return !!(data.vehicleType || data.categoryId);
}, {
    message: 'Debe proporcionar vehicleType o categoryId',
    path: ['vehicleType'],
});

const updateStatusSchema = z.object({
    status: z.enum(['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED']),
    assignedWasherId: z.string().uuid().optional(),
    cancellationReason: z.string().min(1).optional(), // Required when status is CANCELLED
}).refine((data) => {
    // If status is CANCELLED, cancellationReason is required
    if (data.status === 'CANCELLED' && !data.cancellationReason) {
        return false;
    }
    return true;
}, {
    message: 'El motivo de cancelación es requerido cuando se cancela una orden',
    path: ['cancellationReason'],
});

export const createSmartOrder = async (req: Request, res: Response) => {
    try {
        // Parse services from JSON string if it's multipart/form-data
        const bodyData = { ...req.body };
        if (typeof bodyData.services === 'string') {
            bodyData.services = JSON.parse(bodyData.services);
        }

        const data = smartCheckInSchema.parse(bodyData);

        // Get uploaded file paths
        const files = req.files as Express.Multer.File[];
        const imagePaths = files ? files.map(file => `/uploads/vehicles/${file.filename}`) : [];

        const order = await OrderService.smartCheckIn({
            ...data,
            images: imagePaths
        });

        // Emit socket event
        try {
            getIO().emit('orders:updated', { type: 'CREATE', order });
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.status(201).json(order);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al crear la orden' });
    }
};

export const getOrders = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as any; // Optional filter
        const orders = await OrderService.getOrders(status);
        res.json(orders);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener las órdenes' });
    }
};

const getOrdersPaginatedSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    status: z.union([
        z.enum(['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED']),
        z.literal('')
    ]).optional(),
    plate: z.string().optional(),
    clientName: z.string().optional(),
    supervisorId: z.union([z.string().uuid(), z.literal('')]).optional(),
    washerId: z.union([z.string().uuid(), z.literal('')]).optional(),
    vehicleCategory: z.union([
        z.enum(['MOTO', 'AUTO', 'SUV', 'PICKUP', 'CAMION']),
        z.literal('')
    ]).optional(),
    serviceId: z.union([z.string().uuid(), z.literal('')]).optional(),
}).transform((data) => {
    // Convert empty strings to undefined
    return {
        page: data.page,
        limit: data.limit,
        status: data.status === '' ? undefined : data.status,
        plate: data.plate === '' ? undefined : data.plate,
        clientName: data.clientName === '' ? undefined : data.clientName,
        supervisorId: data.supervisorId === '' ? undefined : data.supervisorId,
        washerId: data.washerId === '' ? undefined : data.washerId,
        vehicleCategory: data.vehicleCategory === '' ? undefined : data.vehicleCategory,
        serviceId: data.serviceId === '' ? undefined : data.serviceId,
    };
});

export const getOrdersPaginated = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const params = getOrdersPaginatedSchema.parse(req.query);

        // Si es un lavador, solo puede ver las órdenes donde está asignado
        if (user?.role === 'WASHER') {
            params.washerId = user.id;
        }

        const result = await OrderService.getOrdersPaginated(params);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al obtener las órdenes' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, assignedWasherId, cancellationReason } = updateStatusSchema.parse(req.body);
        const { order, notification, clientNotification } = await OrderService.updateOrderStatus(id, status, assignedWasherId, cancellationReason);

        // Emit socket event
        try {
            getIO().emit('orders:updated', { type: 'UPDATE', order });

            // Emit notification event para empleados (solo para usuarios con rol)
            if (notification) {
                getIO().emit('notifications:new', notification);
            }

            // Emit notification event para clientes (la notificación de cliente se crea en el servicio)
            if (clientNotification) {
                getIO().emit('notifications:new', clientNotification);
            }
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.json(order);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al actualizar el estado' });
    }
};

export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await OrderService.deleteOrder(id);

        // Emit socket event to notify other clients
        try {
            getIO().emit('orders:updated', { type: 'DELETE', orderUuid: id });
        } catch (e) {
            console.error('Socket emit error:', e);
        }

        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al eliminar la orden' });
    }
};
