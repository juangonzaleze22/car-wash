import { Request, Response } from 'express';
import { PrismaClient, VehicleCategory } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createServiceSchema = z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(), // Descripción opcional
    categoryTarget: z.nativeEnum(VehicleCategory).optional(), // Opcional para compatibilidad
    categoryTargetId: z.string().uuid().optional(), // Preferido: UUID de categoría dinámica
    price: z.number().positive(),
    commissionPercentage: z.number().min(0).max(100),
    active: z.boolean().optional().default(true),
}).refine((data) => {
    // Al menos uno de categoryTarget o categoryTargetId debe estar presente
    return !!(data.categoryTarget || data.categoryTargetId);
}, {
    message: 'Debe proporcionar categoryTarget o categoryTargetId',
    path: ['categoryTarget'],
});

const updateServiceSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(), // Descripción opcional
    categoryTarget: z.nativeEnum(VehicleCategory).optional(),
    categoryTargetId: z.string().uuid().optional(),
    price: z.number().positive().optional(),
    commissionPercentage: z.number().min(0).max(100).optional(),
    active: z.boolean().optional(),
});

export const getServices = async (req: Request, res: Response) => {
    try {
        const activeOnly = req.query.active === 'true';
        const categoryId = req.query.categoryId as string | undefined;

        const where: any = {};
        if (activeOnly) {
            where.active = true;
        }
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
        console.error('Error getting services:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: error.message || 'Error al obtener los servicios',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getServiceById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const service = await prisma.serviceCatalog.findUnique({
            where: { id },
            include: {
                categoryTargetRef: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    }
                }
            }
        });
        if (!service) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        res.json(service);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createService = async (req: Request, res: Response) => {
    try {
        const data = createServiceSchema.parse(req.body);

        // Determinar categoryTarget y categoryTargetId
        let finalCategoryTarget: VehicleCategory;
        let finalCategoryTargetId: string | undefined;

        if (data.categoryTargetId) {
            // Si se proporciona categoryTargetId (preferido), obtener la categoría desde la BD
            const category = await prisma.vehicleCategoryModel.findUnique({
                where: { id: data.categoryTargetId }
            });
            if (!category) {
                return res.status(400).json({ error: 'Categoría de vehículo no encontrada' });
            }
            if (!category.active) {
                return res.status(400).json({ error: 'La categoría de vehículo seleccionada no está activa' });
            }
            // Si es "TODOS", usar AUTO como valor del enum (solo para compatibilidad, el categoryTargetId es lo importante)
            if (category.code === 'TODOS') {
                finalCategoryTarget = VehicleCategory.AUTO; // Valor por defecto para compatibilidad
            } else {
                // Mapear el código al enum
                const enumValue = VehicleCategory[category.code as keyof typeof VehicleCategory];
                finalCategoryTarget = enumValue || VehicleCategory.AUTO; // Fallback seguro
            }
            finalCategoryTargetId = data.categoryTargetId;
        } else if (data.categoryTarget) {
            // Si solo se proporciona categoryTarget (compatibilidad hacia atrás)
            finalCategoryTarget = data.categoryTarget;
            // Buscar la categoría por código
            const category = await prisma.vehicleCategoryModel.findFirst({
                where: { code: data.categoryTarget, active: true }
            });
            finalCategoryTargetId = category?.id;
        } else {
            return res.status(400).json({ error: 'Debe proporcionar categoryTarget o categoryTargetId' });
        }

        const service = await prisma.serviceCatalog.create({
            data: {
                name: data.name,
                description: data.description,
                categoryTarget: finalCategoryTarget,
                categoryTargetId: finalCategoryTargetId,
                price: data.price,
                commissionPercentage: data.commissionPercentage,
                active: data.active ?? true,
            },
            include: {
                categoryTargetRef: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    }
                }
            }
        });
        res.status(201).json(service);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message });
    }
};

export const updateService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateServiceSchema.parse(req.body);

        const existingService = await prisma.serviceCatalog.findUnique({
            where: { id }
        });
        if (!existingService) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        // Si se está actualizando categoryTargetId o categoryTarget, resolver ambos
        const updateData: any = { ...data };

        if (data.categoryTargetId) {
            // Si se proporciona categoryTargetId, obtener la categoría desde la BD
            const category = await prisma.vehicleCategoryModel.findUnique({
                where: { id: data.categoryTargetId }
            });
            if (!category) {
                return res.status(400).json({ error: 'Categoría de vehículo no encontrada' });
            }
            if (!category.active) {
                return res.status(400).json({ error: 'La categoría de vehículo seleccionada no está activa' });
            }
            // Si es "TODOS", usar AUTO como valor del enum (solo para compatibilidad)
            if (category.code === 'TODOS') {
                updateData.categoryTarget = VehicleCategory.AUTO; // Valor por defecto para compatibilidad
            } else {
                // Mapear el código al enum
                const enumValue = VehicleCategory[category.code as keyof typeof VehicleCategory];
                updateData.categoryTarget = enumValue || VehicleCategory.AUTO;
            }
            updateData.categoryTargetId = data.categoryTargetId;
        } else if (data.categoryTarget) {
            // Si solo se proporciona categoryTarget, buscar la categoría por código
            const category = await prisma.vehicleCategoryModel.findFirst({
                where: { code: data.categoryTarget, active: true }
            });
            updateData.categoryTargetId = category?.id;
        }

        const service = await prisma.serviceCatalog.update({
            where: { id },
            data: updateData,
            include: {
                categoryTargetRef: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    }
                }
            }
        });
        res.json(service);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message });
    }
};

export const deleteService = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existingService = await prisma.serviceCatalog.findUnique({
            where: { id },
            include: { orderItems: true }
        });
        if (!existingService) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        // Si tiene órdenes asociadas, solo desactivamos en lugar de eliminar
        if (existingService.orderItems.length > 0) {
            const service = await prisma.serviceCatalog.update({
                where: { id },
                data: { active: false }
            });
            return res.json({ message: 'Servicio desactivado (tiene órdenes asociadas)', service });
        }

        await prisma.serviceCatalog.delete({
            where: { id }
        });
        res.json({ message: 'Servicio eliminado exitosamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
