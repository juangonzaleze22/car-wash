import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Crear una notificación
 * 
 * @param data - Datos de la notificación
 * @param data.role - Rol del empleado que debe recibir la notificación (opcional)
 *                    - Si se especifica: Solo los usuarios con ese rol verán la notificación
 *                    - Si es null/undefined: Notificación global (visible para todos los empleados) o para clientes
 * @param data.orderId - ID de la orden asociada (opcional)
 */
export const createNotification = async (data: {
    message: string;
    type: string;
    role?: UserRole;
    orderId?: number;
    deliveryRequestId?: string;
}) => {
    return prisma.notification.create({
        data
    });
};

/**
 * Obtener notificaciones por rol
 * 
 * Los empleados ven:
 * - Notificaciones específicas de su rol (role = su rol)
 * - Notificaciones globales (role = null) que son para todos los empleados
 * 
 * Los clientes ven:
 * - Notificaciones sin rol (role = null) asociadas a sus órdenes
 *   (se filtran en el controlador por vehículos del cliente)
 */
export const getNotificationsByRole = async (role: UserRole) => {
    return prisma.notification.findMany({
        where: {
            OR: [
                { role: role },      // Notificaciones específicas del rol
                { role: null }        // Notificaciones globales (para todos los empleados)
            ]
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 50 // Limit to last 50 notifications
    });
};

export const markAsRead = async (id: string) => {
    return prisma.notification.update({
        where: { id },
        data: { read: true }
    });
};
