import { PrismaClient, DeliveryRequestStatus, UserRole } from '@prisma/client';
import * as NotificationService from './notification.service';
import * as OrderService from './order.service';
import * as ConfigService from './config.service';
import { getIO } from '../socket';

const prisma = new PrismaClient();

interface CreateDeliveryRequestDTO {
    clientId: string;
    vehicleId: string;
    address?: string;
    latitude: number;
    longitude: number;
    services: any[]; // {serviceId, name, price}
    totalAmount: number;
    notes?: string;
}

export const createRequest = async (data: CreateDeliveryRequestDTO) => {
    const deliveryFee = await ConfigService.getDeliveryFee();
    const subtotal = data.services.reduce((sum: number, s: any) => sum + Number(s.price), 0);
    const totalAmount = subtotal + deliveryFee;

    const request = await prisma.deliveryRequest.create({
        data: {
            clientId: data.clientId,
            vehicleId: data.vehicleId,
            address: data.address || '',
            latitude: data.latitude,
            longitude: data.longitude,
            services: data.services,
            deliveryFee: deliveryFee,
            totalAmount: totalAmount,
            notes: data.notes,
            status: DeliveryRequestStatus.PENDING,
        },
        include: {
            client: true,
            vehicle: true,
        },
    });

    // Notify supervisors and admins
    const notification = await NotificationService.createNotification({
        message: `Nueva solicitud de lavado de ${(request as any).client.name} (${(request as any).vehicle.plate})`,
        type: 'INFO',
        // Se deja el rol como undefined para que sea una notificación global 
        // y llegue tanto a supervisores como administradores
        deliveryRequestId: request.id,
    });

    try {
        getIO().emit('notifications:new', notification);
        getIO().emit('delivery-requests:new', request);
        // También emitir un evento específico para administradores si es necesario
        getIO().to('admin').emit('notifications:admin', notification);
    } catch (e) {
        console.error('Socket emit error:', e);
    }

    return request;
};

export const getPendingRequests = async () => {
    return prisma.deliveryRequest.findMany({
        where: { status: DeliveryRequestStatus.PENDING },
        include: {
            client: true,
            vehicle: { include: { categoryRef: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getRequestsByClient = async (clientId: string) => {
    return prisma.deliveryRequest.findMany({
        where: { clientId },
        include: {
            vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getRequestById = async (id: string) => {
    return prisma.deliveryRequest.findUnique({
        where: { id },
        include: {
            client: true,
            vehicle: { include: { categoryRef: true } },
        },
    });
};

export const updateRequestStatus = async (id: string, status: DeliveryRequestStatus, supervisorId: string, cancellationReason?: string) => {
    const request = await prisma.deliveryRequest.findUnique({
        where: { id },
        include: { client: true, vehicle: true },
    });

    if (!request) throw new Error('Solicitud no encontrada');

    const updateData: any = { status, updatedAt: new Date() };

    if (status === DeliveryRequestStatus.ACCEPTED) {
        updateData.acceptedById = supervisorId;
        updateData.acceptedAt = new Date();

        // Convert to Order
        const serviceIds = (request.services as any[]).map(s => s.serviceId);

        try {
            const order = await OrderService.smartCheckIn({
                plate: request.vehicle.plate,
                categoryId: request.vehicle.categoryId || undefined,
                services: serviceIds,
                supervisorId: supervisorId,
                clientPhone: request.client.phone,
                clientName: request.client.name,
                deliveryFee: Number(request.deliveryFee),
            });
            updateData.convertedToOrderId = order.id;
        } catch (error: any) {
            console.error('Error converting request to order:', error);
            throw new Error(`Error al crear la orden: ${error.message}`);
        }
    } else if (status === DeliveryRequestStatus.REJECTED) {
        updateData.cancellationReason = cancellationReason;
    }

    const updatedRequest = await prisma.deliveryRequest.update({
        where: { id },
        data: updateData,
        include: { client: true, vehicle: true },
    });

    // Notify client
    const clientNotification = await NotificationService.createNotification({
        message: status === DeliveryRequestStatus.ACCEPTED
            ? `Tu solicitud de lavado para ${request.vehicle.plate} ha sido ACEPTADA.`
            : `Tu solicitud de lavado para ${request.vehicle.plate} ha sido RECHAZADA.`,
        type: status === DeliveryRequestStatus.ACCEPTED ? 'SUCCESS' : 'ERROR',
        deliveryRequestId: updatedRequest.id,
    });

    try {
        getIO().emit('notifications:new', clientNotification);
        getIO().emit('delivery-requests:updated', updatedRequest);
    } catch (e) {
        console.error('Socket emit error:', e);
    }

    return updatedRequest;
};
