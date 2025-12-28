import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const createCategorySchema = z.object({
    name: z.string().min(1).max(50),
    code: z.string().min(1).max(20).transform(val => val.toUpperCase().trim()),
    description: z.string().nullable().optional(),
    active: z.boolean().optional().default(true),
});

const updateCategorySchema = z.object({
    name: z.string().min(1).max(50).optional(),
    code: z.string().min(1).max(20).transform(val => val.toUpperCase().trim()).optional(),
    description: z.string().nullable().optional(),
    active: z.boolean().optional(),
});

/**
 * GET /api/categories
 * Obtener todas las categorías
 */
export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const activeOnly = req.query.active === 'true';

        const where: any = {};
        if (activeOnly) {
            where.active = true;
        }

        const categories = await prisma.vehicleCategoryModel.findMany({
            where,
            orderBy: {
                name: 'asc'
            },
            include: {
                _count: {
                    select: {
                        vehicles: true,
                        services: true
                    }
                }
            }
        });

        // Obtener el conteo de servicios realizados por categoría (OrderItems de órdenes completadas)
        const completedOrders = await prisma.order.findMany({
            where: {
                status: 'COMPLETED',
            },
            select: {
                vehicleId: true,
                items: {
                    select: {
                        id: true,
                    }
                }
            },
        });

        // Obtener información de vehículos y sus categorías
        const vehicleIds = [...new Set(completedOrders.map(order => order.vehicleId))];
        const vehiclesWithCategories = await prisma.vehicle.findMany({
            where: {
                id: { in: vehicleIds },
            },
            select: {
                id: true,
                categoryId: true,
            },
        });

        // Crear un mapa de vehicleId -> categoryId
        const vehicleCategoryMap = new Map<string, string>();
        vehiclesWithCategories.forEach(vehicle => {
            if (vehicle.categoryId) {
                vehicleCategoryMap.set(vehicle.id, vehicle.categoryId);
            }
        });

        // Contar servicios realizados por categoría
        const servicesPerCategory = new Map<string, number>();
        completedOrders.forEach(order => {
            const categoryId = vehicleCategoryMap.get(order.vehicleId);
            if (categoryId) {
                const currentCount = servicesPerCategory.get(categoryId) || 0;
                servicesPerCategory.set(categoryId, currentCount + order.items.length);
            }
        });

        // Agregar el conteo de servicios realizados a cada categoría
        const categoriesWithStats = categories.map(category => ({
            ...category,
            servicesPerformed: servicesPerCategory.get(category.id) || 0
        }));

        res.json(categoriesWithStats);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener las categorías' });
    }
};

/**
 * GET /api/categories/:id
 * Obtener una categoría por ID
 */
export const getCategoryById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const category = await prisma.vehicleCategoryModel.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        vehicles: true,
                        services: true
                    }
                }
            }
        });

        if (!category) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        res.json(category);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener la categoría' });
    }
};

/**
 * POST /api/categories
 * Crear una nueva categoría
 */
export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const data = createCategorySchema.parse(req.body);

        // Verificar si el código ya existe
        const existingCode = await prisma.vehicleCategoryModel.findUnique({
            where: { code: data.code }
        });

        if (existingCode) {
            return res.status(400).json({ error: 'Ya existe una categoría con este código' });
        }

        // Verificar si el nombre ya existe
        const existingName = await prisma.vehicleCategoryModel.findUnique({
            where: { name: data.name }
        });

        if (existingName) {
            return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
        }

        const category = await prisma.vehicleCategoryModel.create({
            data
        });

        res.status(201).json(category);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al crear la categoría' });
    }
};

/**
 * PATCH /api/categories/:id
 * Actualizar una categoría
 */
export const updateCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateCategorySchema.parse(req.body);

        // Verificar que la categoría existe
        const existingCategory = await prisma.vehicleCategoryModel.findUnique({
            where: { id }
        });

        if (!existingCategory) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        // Si se cambia el código, verificar que no exista otro con ese código
        if (data.code && data.code !== existingCategory.code) {
            const codeExists = await prisma.vehicleCategoryModel.findUnique({
                where: { code: data.code }
            });

            if (codeExists) {
                return res.status(400).json({ error: 'Ya existe otra categoría con este código' });
            }
        }

        // Si se cambia el nombre, verificar que no exista otro con ese nombre
        if (data.name && data.name !== existingCategory.name) {
            const nameExists = await prisma.vehicleCategoryModel.findUnique({
                where: { name: data.name }
            });

            if (nameExists) {
                return res.status(400).json({ error: 'Ya existe otra categoría con este nombre' });
            }
        }

        const category = await prisma.vehicleCategoryModel.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.code && { code: data.code }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.active !== undefined && { active: data.active }),
            }
        });

        res.json(category);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al actualizar la categoría' });
    }
};

/**
 * DELETE /api/categories/:id
 * Eliminar una categoría
 */
export const deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Verificar que la categoría existe
        const category = await prisma.vehicleCategoryModel.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        vehicles: true,
                        services: true
                    }
                }
            }
        });

        if (!category) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        // Verificar que no tenga vehículos o servicios asociados
        if (category._count.vehicles > 0 || category._count.services > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar la categoría porque tiene vehículos o servicios asociados',
                details: {
                    vehicles: category._count.vehicles,
                    services: category._count.services
                }
            });
        }

        await prisma.vehicleCategoryModel.delete({
            where: { id }
        });

        res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al eliminar la categoría' });
    }
};

