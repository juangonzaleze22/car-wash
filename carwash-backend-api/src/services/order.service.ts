import { PrismaClient, VehicleCategory, ClientType, OrderStatus, UserRole } from '@prisma/client';
import * as NotificationService from './notification.service';
import * as WasherService from './washer.service';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SmartCheckInDTO {
    plate: string;
    clientPhone?: string;
    clientName?: string;
    vehicleType?: string; // Cambiado a string para aceptar cualquier código dinámico
    categoryId?: string; // Preferido: usar categoryId
    services: string[]; // Service IDs
    supervisorId: string;
    images?: string[]; // Image paths
    assignedWasherId?: string; // Optional washer assignment
    deliveryFee?: number; // Optional delivery fee
}

/**
 * Limpia el número de teléfono removiendo caracteres de formato
 * Ejemplo: "(0414) 575 7263" -> "04145757263"
 */
const cleanPhoneNumber = (phone: string | undefined | null): string => {
    if (!phone) return '';
    // Remover todos los caracteres que no sean números
    return phone.replace(/\D/g, '');
};

export const smartCheckIn = async (data: SmartCheckInDTO) => {
    const { plate, clientPhone, clientName, vehicleType, categoryId, services, supervisorId, images, assignedWasherId, deliveryFee = 0 } = data;

    // Limpiar el teléfono antes de procesar
    const cleanClientPhone = cleanPhoneNumber(clientPhone);

    // Determinar vehicleType y categoryId (dinámico desde la base de datos)
    let finalVehicleType: VehicleCategory;
    let finalCategoryId: string | undefined;

    if (categoryId) {
        // Si se proporciona categoryId (preferido), obtener la categoría desde la BD
        const category = await prisma.vehicleCategoryModel.findUnique({
            where: { id: categoryId }
        });
        if (!category) {
            throw new Error('Categoría de vehículo no encontrada');
        }
        if (!category.active) {
            throw new Error('La categoría de vehículo seleccionada no está activa');
        }
        // Intentar mapear el código al enum para compatibilidad con el schema de BD
        // Si el código no existe en el enum, usar AUTO como fallback (el enum es solo para compatibilidad)
        const enumValue = VehicleCategory[category.code as keyof typeof VehicleCategory];
        finalVehicleType = enumValue || VehicleCategory.AUTO; // Fallback seguro para el enum
        finalCategoryId = categoryId;
    } else if (vehicleType) {
        // Si solo se proporciona vehicleType (compatibilidad hacia atrás)
        // Buscar la categoría por código en la BD (dinámico)
        const category = await prisma.vehicleCategoryModel.findFirst({
            where: { code: vehicleType.toUpperCase(), active: true }
        });
        if (category) {
            // Categoría encontrada en BD (dinámica)
            finalCategoryId = category.id;
            const enumValue = VehicleCategory[category.code as keyof typeof VehicleCategory];
            finalVehicleType = enumValue || VehicleCategory.AUTO; // Fallback para el enum
        } else {
            // Si no se encuentra en BD, intentar validar contra el enum (solo para compatibilidad con datos antiguos)
            const enumValue = VehicleCategory[vehicleType.toUpperCase() as keyof typeof VehicleCategory];
            if (!enumValue) {
                throw new Error(`Tipo de vehículo "${vehicleType}" no encontrado. Por favor use categoryId para categorías dinámicas.`);
            }
            finalVehicleType = enumValue;
            // No hay categoryId porque no se encontró en BD
            finalCategoryId = undefined;
        }
    } else {
        throw new Error('Debe proporcionar vehicleType o categoryId');
    }

    // 1. Verify Vehicle
    let vehicle = await prisma.vehicle.findUnique({
        where: { plate },
        include: { client: true },
    });

    if (vehicle) {
        // Check for active order
        const activeOrder = await prisma.order.findFirst({
            where: {
                vehicleId: vehicle.id,
                status: { not: OrderStatus.COMPLETED },
            },
        });
        if (activeOrder && activeOrder.status !== OrderStatus.CANCELLED) {
            throw new Error('Vehículo ya tiene una orden activa');
        }
    } else {
        // 2. Vehicle not found → check client
        if (!cleanClientPhone || !clientName) {
            throw new Error('Datos del cliente requeridos para vehículo nuevo');
        }
        let client = await prisma.client.findUnique({
            where: { phone: cleanClientPhone },
        });
        if (!client) {
            // Hashear contraseña por defecto
            const defaultPassword = await bcrypt.hash('cliente123', 10);
            client = await prisma.client.create({
                data: {
                    name: clientName,
                    phone: cleanClientPhone, // Guardar teléfono limpio
                    password: defaultPassword, // Contraseña por defecto hasheada
                    type: ClientType.PARTICULAR,
                },
            });
        }
        // Create Vehicle
        vehicle = await prisma.vehicle.create({
            data: {
                plate,
                category: finalVehicleType, // Mantener enum para compatibilidad
                categoryId: finalCategoryId, // Usar categoryId si está disponible
                clientId: client.id,
            },
            include: { client: true },
        });
    }

    // 3. Create Order
    const selectedServices = await prisma.serviceCatalog.findMany({
        where: { id: { in: services } },
    });
    if (selectedServices.length === 0) {
        throw new Error('Debe seleccionar al menos un servicio');
    }
    const totalAmount = selectedServices.reduce((sum: number, s: any) => sum + Number(s.price), 0);

    // Ensure supervisor exists (auto‑create for demo purposes)
    let supervisor = await prisma.user.findUnique({ where: { id: supervisorId } });
    if (!supervisor) {
        supervisor = await prisma.user.create({
            data: {
                id: supervisorId,
                username: `auto_supervisor_${supervisorId}`,
                password: 'temp', // TODO: hash passwords in real app
                role: UserRole.SUPERVISOR,
                active: true,
            },
        });
    }

    // Ensure washer exists if provided (auto‑create for demo purposes)
    let washer: any = null;
    if (assignedWasherId) {
        washer = await prisma.user.findUnique({ where: { id: assignedWasherId } });
        if (!washer) {
            washer = await prisma.user.create({
                data: {
                    id: assignedWasherId,
                    username: `auto_washer_${assignedWasherId}`,
                    password: 'temp',
                    role: UserRole.WASHER,
                    active: true,
                },
            });
        } else if (washer.role !== UserRole.WASHER) {
            throw new Error(`Usuario ${assignedWasherId} no es un lavador`);
        }
    }

    const order = await prisma.order.create({
        data: {
            vehicleId: vehicle.id,
            supervisorId,
            status: OrderStatus.RECEIVED,
            totalAmount: Number(totalAmount) + Number(deliveryFee),
            deliveryFee: deliveryFee,
            images: images || [],
            // Initialize timer fields explicitly to avoid any issues
            startedAt: null,
            completedAt: null,
            duration: null,
            items: {
                create: selectedServices.map((s: any) => ({
                    serviceId: s.id,
                    commissionAmount: Number(s.price) * (Number(s.commissionPercentage) / 100),
                    assignedWasherId: assignedWasherId || null,
                })),
            },
        },
        include: {
            items: { include: { service: true, assignedWasher: true } },
            vehicle: { include: { client: true } },
        },
    });
    return order;
};

/**
 * Verifica si una orden está completamente pagada y la completa automáticamente si está en WAITING_PAYMENT
 * @param orderId ID de la orden a verificar (number)
 * @returns true si la orden fue completada, false si no
 */
export const checkAndAutoCompleteOrder = async (orderId: number): Promise<boolean> => {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            payments: true,
        },
    });

    if (!order || order.status !== OrderStatus.WAITING_PAYMENT) {
        return false;
    }

    // Calcular total pagado en USD
    let totalPaidUSD = 0;
    for (const payment of order.payments) {
        if (payment.amountUSD) {
            totalPaidUSD += Number(payment.amountUSD);
        } else if (payment.currency === 'USD') {
            totalPaidUSD += Number(payment.amount);
        } else {
            totalPaidUSD += Number(payment.amount) / Number(payment.exchangeRate);
        }
    }

    const orderTotal = Number(order.totalAmount);

    // Si está completamente pagada, completarla automáticamente
    if (totalPaidUSD >= orderTotal - 0.01) {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: OrderStatus.COMPLETED,
                closedAt: new Date(),
                completedAt: order.completedAt || new Date(),
            },
        });

        // Registrar ganancias y emitir KPIs
        try {
            await WasherService.registerEarningsForCompletedOrder(orderId);
            const { emitKPIsOnOrderComplete } = await import('./kpi-emitter.service');
            await emitKPIsOnOrderComplete(orderId);
        } catch (error) {
            console.error(`Error al procesar orden ${orderId} completada automáticamente:`, error);
        }

        return true;
    }

    return false;
};

export const getOrders = async (status?: OrderStatus) => {
    const orders = await prisma.order.findMany({
        where: status ? { status } : { status: { not: OrderStatus.COMPLETED } },
        include: {
            vehicle: { include: { client: true } },
            items: { include: { service: true, assignedWasher: true } },
            payments: { include: { cashier: { select: { id: true, username: true, role: true } } } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Verificar y completar automáticamente solo las órdenes en WAITING_PAYMENT que se están retornando
    const completedOrderIds: number[] = [];
    const waitingOrders = orders.filter(o => o.status === OrderStatus.WAITING_PAYMENT);
    for (const order of waitingOrders) {
        const wasCompleted = await checkAndAutoCompleteOrder(order.id);
        if (wasCompleted) {
            completedOrderIds.push(order.id);
        }
    }

    // Si se completaron órdenes, recargar solo esas órdenes para obtener el estado actualizado
    // y filtrarlas del resultado (ya no aparecen porque ahora están COMPLETED)
    const resultOrders = completedOrderIds.length > 0
        ? orders.filter(o => !completedOrderIds.includes(o.id))
        : orders;

    // Mapear los campos Decimal a números para evitar problemas de serialización
    return resultOrders.map(order => ({
        ...order,
        totalAmount: Number(order.totalAmount),
        changeAmount: order.changeAmount ? Number(order.changeAmount) : null,
        deliveryFee: Number(order.deliveryFee),
        payments: order.payments.map(payment => ({
            ...payment,
            amount: Number(payment.amount),
            exchangeRate: Number(payment.exchangeRate),
            amountUSD: Number(payment.amountUSD),
        })),
        items: order.items.map(item => ({
            ...item,
            service: {
                ...item.service,
                price: item.service.price ? Number(item.service.price) : null,
            },
            commissionAmount: item.commissionAmount ? Number(item.commissionAmount) : null,
        })),
    }));
};

interface GetOrdersPaginatedParams {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    plate?: string;
    clientName?: string;
    supervisorId?: string;
    washerId?: string;
    vehicleCategory?: VehicleCategory;
    serviceId?: string;
}

export const getOrdersPaginated = async (params: GetOrdersPaginatedParams) => {
    const {
        page = 1,
        limit = 10,
        status,
        plate,
        clientName,
        supervisorId,
        washerId,
        vehicleCategory,
        serviceId,
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status) {
        where.status = status;
    }

    if (plate) {
        where.vehicle = {
            plate: { contains: plate, mode: 'insensitive' },
        };
    }

    if (clientName) {
        where.vehicle = {
            ...where.vehicle,
            client: {
                name: { contains: clientName, mode: 'insensitive' },
            },
        };
    }

    if (supervisorId) {
        where.supervisorId = supervisorId;
    }

    if (vehicleCategory) {
        where.vehicle = {
            ...where.vehicle,
            category: vehicleCategory,
        };
    }

    if (washerId) {
        where.items = {
            some: {
                assignedWasherId: washerId,
            },
        };
    }

    if (serviceId) {
        where.items = {
            ...where.items,
            some: {
                serviceId: serviceId,
            },
        };
    }

    // Get total count
    const total = await prisma.order.count({ where });

    // Get orders
    const orders = await prisma.order.findMany({
        where,
        include: {
            vehicle: { include: { client: true } },
            items: { include: { service: true, assignedWasher: true } },
            supervisor: { select: { id: true, username: true, role: true } },
            payments: { include: { cashier: { select: { id: true, username: true, role: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
    });

    return {
        orders,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Updates the status of an order and handles the timer (startedAt / completedAt / duration).
 * The timer starts when the order first enters IN_PROGRESS and stops when it leaves IN_PROGRESS
 * (e.g., goes to WAITING_PAYMENT, COMPLETED, or any other status). The duration is stored
 * in minutes.
 */
export const updateOrderStatus = async (orderUuid: string, newStatus: OrderStatus, assignedWasherId?: string, cancellationReason?: string) => {
    // Validate order exists
    const order = await prisma.order.findUnique({
        where: { uuid: orderUuid },
    });
    if (!order) {
        throw new Error('Orden no encontrada');
    }

    const updateData: any = { status: newStatus };

    // Validar que la orden esté completamente pagada antes de permitir COMPLETED
    if (newStatus === OrderStatus.COMPLETED) {
        // Obtener la orden con sus pagos
        const orderWithPayments = await prisma.order.findUnique({
            where: { uuid: orderUuid },
            include: { payments: true },
        });

        if (!orderWithPayments) {
            throw new Error('Orden no encontrada');
        }

        // Calcular total pagado en USD
        const totalPaidUSD = orderWithPayments.payments.reduce(
            (sum, payment) => sum + Number(payment.amountUSD || 0),
            0
        );
        const orderTotal = Number(orderWithPayments.totalAmount);

        // Validar que el pago cubra el total (permitir pequeño margen para errores de punto flotante)
        if (totalPaidUSD < orderTotal - 0.01) {
            throw new Error(
                `No se puede completar una orden sin pago completo. Total: $${orderTotal.toFixed(2)}, Pagado: $${totalPaidUSD.toFixed(2)}`
            );
        }

        // Establecer closedAt y completedAt solo cuando se marca como COMPLETED
        updateData.closedAt = new Date();
        if (!order.completedAt) {
            updateData.completedAt = new Date();
        }

        // Registrar ganancias de lavadores si no se registraron antes (al pagar)
        try {
            const orderItems = await prisma.orderItem.findMany({
                where: {
                    orderId: order.id,
                    assignedWasherId: { not: null },
                },
                select: {
                    id: true,
                },
            });

            // Verificar si ya existen ganancias registradas para esta orden
            const existingEarnings = await prisma.washerEarnings.findFirst({
                where: {
                    orderId: order.id,
                },
            });

            // Si no hay ganancias registradas, registrarlas ahora
            if (!existingEarnings && orderItems.length > 0) {
                await WasherService.registerEarningsForCompletedOrder(order.id);
            }
        } catch (error) {
            // Log error but don't fail the completion process
            console.error('Error al registrar ganancias de lavadores al completar:', error);
        }

        // Emitir KPIs actualizados cuando se marca como COMPLETED
        try {
            const { emitKPIsOnPaymentComplete } = await import('./kpi-emitter.service');
            await emitKPIsOnPaymentComplete(order.id);
        } catch (error) {
            // Log error but don't fail the completion process
            console.error('Error al emitir KPIs al completar:', error);
        }
    }

    // If cancelling, save the cancellation reason
    if (newStatus === OrderStatus.CANCELLED && cancellationReason) {
        updateData.cancellationReason = cancellationReason;

        // If the order was previously completed, cancel any pending earnings
        if (order.status === OrderStatus.COMPLETED) {
            try {
                // Obtener los lavadores afectados antes de cancelar
                const orderItems = await prisma.orderItem.findMany({
                    where: {
                        orderId: order.id,
                        assignedWasherId: { not: null },
                    },
                    select: {
                        assignedWasherId: true,
                    },
                });
                const washerIds = [...new Set(orderItems.map(item => item.assignedWasherId).filter((id): id is string => id !== null))];

                await WasherService.cancelEarnings(order.id);

                // Emitir eventos de KPIs actualizados
                if (washerIds.length > 0) {
                    const { emitKPIsOnEarningsPaid } = await import('./kpi-emitter.service');
                    await emitKPIsOnEarningsPaid(washerIds);
                }
            } catch (error) {
                // Log error but don't fail the cancellation
                console.error('Error al cancelar ganancias de lavadores:', error);
            }
        }
    } else if (newStatus !== OrderStatus.CANCELLED) {
        // Clear cancellation reason if status is not CANCELLED
        updateData.cancellationReason = null;
    }

    // Timer logic
    if (newStatus === OrderStatus.IN_PROGRESS) {
        // If entering IN_PROGRESS, adjust startedAt to account for time already spent
        if (!(order as any).startedAt) {
            // First time entering IN_PROGRESS
            updateData.startedAt = new Date();
            updateData.completedAt = null; // Ensure completedAt is cleared
        } else {
            // Re-entering IN_PROGRESS after being paused
            // Calculate the total time already spent in process
            const previousCompletedAt = (order as any).completedAt;
            const previousStartedAt = (order as any).startedAt;

            if (previousCompletedAt && previousStartedAt) {
                // Calculate total time already spent
                const timeAlreadySpent = previousCompletedAt.getTime() - previousStartedAt.getTime();
                // Set new startedAt to be "now minus the time already spent"
                // This way the timer continues from where it left off
                const now = new Date();
                const newStartedAt = new Date(now.getTime() - timeAlreadySpent);
                updateData.startedAt = newStartedAt;
            } else {
                // No previous completedAt, just continue from original startedAt
                // This shouldn't happen normally, but handle it just in case
                updateData.startedAt = previousStartedAt;
            }
            updateData.completedAt = null; // Clear completedAt to resume counting
        }
    } else {
        // When leaving IN_PROGRESS (status is not IN_PROGRESS)
        // Stop timer and calculate duration if order was in progress
        if ((order as any).startedAt) {
            const now = new Date();
            updateData.completedAt = now;
            const durationMs = now.getTime() - (order as any).startedAt.getTime();
            updateData.duration = Math.round(durationMs / (1000 * 60));
        }
    }

    // Assign washer if provided
    if (assignedWasherId) {
        await prisma.orderItem.updateMany({
            where: { orderId: order.id },
            data: { assignedWasherId },
        });
    }

    const updatedOrder = await prisma.order.update({
        where: { uuid: orderUuid },
        data: updateData,
        include: {
            vehicle: { include: { client: true } },
            items: { include: { service: true, assignedWasher: true } },
        },
    });

    /**
     * SISTEMA DE NOTIFICACIONES POR ROL
     * 
     * Cuando cambia el estado de una orden, se crean notificaciones para:
     * 1. EMPLEADOS: Se envía una notificación al rol específico que está involucrado en ese estado
     *    - WAITING_PAYMENT → CASHIER (el cajero debe procesar el pago)
     *    - COMPLETED → SUPERVISOR (el supervisor debe estar informado)
     *    - Otros estados → SUPERVISOR (el supervisor supervisa el proceso)
     * 
     * 2. CLIENTE: Siempre se envía una notificación al cliente cuando cambia el estado de su orden
     *    - Sin rol (role: null) para que sea visible solo para el cliente correspondiente
     * 
     * Las notificaciones se filtran en el frontend:
     * - Empleados: Solo ven notificaciones de su rol o sin rol (globales)
     * - Clientes: Solo ven notificaciones sin rol asociadas a sus órdenes
     */

    // Notification para empleados según el rol involucrado en el cambio de estado
    let notificationMessage = `Orden ${updatedOrder.vehicle.plate} actualizada a ${newStatus}`;
    let notificationRole: UserRole | undefined;

    // Determinar qué rol debe recibir la notificación según el estado
    switch (newStatus) {
        case OrderStatus.RECEIVED:
            // Orden recibida: Supervisor debe estar al tanto
            notificationMessage = `Nueva orden recibida: ${updatedOrder.vehicle.plate}`;
            notificationRole = UserRole.SUPERVISOR;
            break;
        case OrderStatus.IN_PROGRESS:
            // Orden en proceso: Supervisor supervisa el trabajo
            notificationMessage = `Orden ${updatedOrder.vehicle.plate} en proceso`;
            notificationRole = UserRole.SUPERVISOR;
            break;
        case OrderStatus.QUALITY_CHECK:
            // Control de calidad: Supervisor verifica la calidad
            notificationMessage = `Orden ${updatedOrder.vehicle.plate} en control de calidad`;
            notificationRole = UserRole.SUPERVISOR;
            break;
        case OrderStatus.WAITING_PAYMENT:
            // Lista para pago: Cajero debe procesar el pago
            notificationMessage = `Orden ${updatedOrder.vehicle.plate} lista para pago`;
            notificationRole = UserRole.CASHIER;
            break;
        case OrderStatus.COMPLETED:
            // Orden completada: Supervisor debe estar informado
            notificationMessage = `Orden ${updatedOrder.vehicle.plate} completada`;
            notificationRole = UserRole.SUPERVISOR;
            break;
        case OrderStatus.CANCELLED:
            // Orden cancelada: Supervisor debe estar informado
            notificationMessage = `Orden ${updatedOrder.vehicle.plate} cancelada`;
            notificationRole = UserRole.SUPERVISOR;
            break;
        default:
            // Por defecto, Supervisor recibe la notificación
            notificationRole = UserRole.SUPERVISOR;
    }

    // Crear notificación para el rol correspondiente
    const notification = await NotificationService.createNotification({
        message: notificationMessage,
        type: newStatus === OrderStatus.COMPLETED ? 'SUCCESS' :
            newStatus === OrderStatus.CANCELLED ? 'ERROR' : 'INFO',
        role: notificationRole,
        orderId: updatedOrder.id,
    });

    // Crear notificación para el cliente (sin rol, asociada a la orden)
    // Cada cambio de estado debe generar una notificación para el cliente
    const clientNotificationMessages: { [key: string]: string } = {
        'RECEIVED': `Tu orden (Placa: ${updatedOrder.vehicle.plate}) ha sido recibida`,
        'IN_PROGRESS': `Tu orden (Placa: ${updatedOrder.vehicle.plate}) está en proceso`,
        'QUALITY_CHECK': `Tu orden (Placa: ${updatedOrder.vehicle.plate}) está en control de calidad`,
        'WAITING_PAYMENT': `Tu orden (Placa: ${updatedOrder.vehicle.plate}) está lista para pago`,
        'COMPLETED': `Tu orden (Placa: ${updatedOrder.vehicle.plate}) ha sido completada`,
        'CANCELLED': `Tu orden (Placa: ${updatedOrder.vehicle.plate}) ha sido cancelada`
    };

    const clientNotificationMessage = clientNotificationMessages[newStatus] || `Tu orden (Placa: ${updatedOrder.vehicle.plate}) ha sido actualizada`;

    // Crear notificación para el cliente correspondiente
    const clientNotification = await NotificationService.createNotification({
        message: clientNotificationMessage,
        type: newStatus === OrderStatus.COMPLETED ? 'SUCCESS' :
            newStatus === OrderStatus.CANCELLED ? 'ERROR' : 'INFO',
        role: undefined, // Sin rol para que sea visible para clientes
        orderId: updatedOrder.id,
    });

    return { order: updatedOrder, notification, clientNotification };
};

export const deleteOrder = async (orderUuid: string) => {
    // Buscar la orden por UUID
    const order = await prisma.order.findUnique({
        where: { uuid: orderUuid },
    });

    if (!order) {
        throw new Error('Orden no encontrada');
    }

    // Eliminar la orden y todas sus dependencias en el orden correcto
    await prisma.$transaction([
        // 1. Desvincular solicitudes de delivery (poner convertedToOrderId en null)
        prisma.deliveryRequest.updateMany({
            where: { convertedToOrderId: order.id },
            data: { convertedToOrderId: null }
        }),
        // 2. Eliminar ganancias de lavadores (dependen de order_items)
        prisma.washerEarnings.deleteMany({ where: { orderId: order.id } }),
        // 3. Eliminar items de la orden
        prisma.orderItem.deleteMany({ where: { orderId: order.id } }),
        // 4. Eliminar pagos
        prisma.payment.deleteMany({ where: { orderId: order.id } }),
        // 5. Eliminar notificaciones
        prisma.notification.deleteMany({ where: { orderId: order.id } }),
        // 6. Finalmente eliminar la orden
        prisma.order.delete({ where: { id: order.id } }),
    ]);

    return { success: true, id: order.id };
};
