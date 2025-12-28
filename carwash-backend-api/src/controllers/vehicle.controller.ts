import { Request, Response } from 'express';
import { PrismaClient, VehicleCategory, ClientType } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const createVehicleSchema = z.object({
    plate: z.string().min(3).transform(val => val.toUpperCase().trim()),
    category: z.preprocess(val => val === '' ? undefined : val, z.nativeEnum(VehicleCategory).optional()),
    categoryId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    clientName: z.string().min(1).optional(),
    clientPhone: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
}).refine(data => data.category || data.categoryId, {
    message: "Debe proporcionar category o categoryId",
    path: ["category"]
});

const updateVehicleSchema = z.object({
    plate: z.string().min(3).transform(val => val.toUpperCase().trim()).optional(),
    category: z.nativeEnum(VehicleCategory).optional(),
    clientId: z.string().uuid().optional(),
    notes: z.string().nullable().optional(),
});

/**
 * GET /api/vehicles/search
 * Buscar vehículos por placa
 */
export const searchVehicles = async (req: Request, res: Response) => {
    try {
        const { plate } = req.query;

        if (!plate || typeof plate !== 'string') {
            return res.json([]);
        }

        const vehicles = await prisma.vehicle.findMany({
            where: {
                plate: {
                    contains: plate.toUpperCase(),
                    mode: 'insensitive'
                }
            },
            include: {
                client: true
            },
            take: 10,
            orderBy: {
                plate: 'asc'
            }
        });

        res.json(vehicles);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al buscar vehículos' });
    }
};

/**
 * GET /api/vehicles
 * Obtener todos los vehículos con paginación
 */
export const getVehicles = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const plate = req.query.plate as string | undefined;
        const category = req.query.category as VehicleCategory | undefined;

        const where: any = {};
        if (plate) {
            where.plate = {
                contains: plate.toUpperCase(),
                mode: 'insensitive'
            };
        }
        if (category) {
            where.category = category;
        }

        const [vehicles, total] = await Promise.all([
            prisma.vehicle.findMany({
                where,
                include: {
                    client: true,
                    orders: {
                        select: {
                            id: true,
                            status: true,
                            createdAt: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 5
                    }
                },
                orderBy: {
                    plate: 'asc'
                },
                skip,
                take: limit,
            }),
            prisma.vehicle.count({ where }),
        ]);

        res.json({
            vehicles,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener vehículos' });
    }
};

/**
 * GET /api/vehicles/:id
 * Obtener un vehículo por ID
 */
export const getVehicleById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const vehicle = await prisma.vehicle.findUnique({
            where: { id },
            include: {
                client: true,
                orders: {
                    include: {
                        items: {
                            include: {
                                service: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehículo no encontrado' });
        }

        res.json(vehicle);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener el vehículo' });
    }
};

/**
 * POST /api/vehicles
 * Crear un nuevo vehículo
 */
export const createVehicle = async (req: AuthRequest, res: Response) => {
    try {
        const data = createVehicleSchema.parse(req.body);

        // Verificar si el vehículo ya existe
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { plate: data.plate }
        });

        if (existingVehicle) {
            return res.status(400).json({ error: 'Ya existe un vehículo con esta placa' });
        }

        let category = data.category;
        let categoryId = data.categoryId;

        // Si se proporciona categoryId, obtener el código para el enum
        if (categoryId && !category) {
            const catModel = await prisma.vehicleCategoryModel.findUnique({
                where: { id: categoryId }
            });
            if (!catModel) {
                return res.status(400).json({ error: 'Categoría no encontrada' });
            }
            category = catModel.code as VehicleCategory;
        } else if (category && !categoryId) {
            // Si se proporciona el enum, buscar el categoryId correspondiente
            const catModel = await prisma.vehicleCategoryModel.findFirst({
                where: { code: category }
            });
            if (catModel) {
                categoryId = catModel.id;
            }
        }

        if (!category) {
            return res.status(400).json({ error: 'Debe proporcionar una categoría válida' });
        }

        // Si se proporciona clientId, usarlo; si no, crear o buscar cliente
        let clientId = data.clientId;
        if (!clientId) {
            if (!data.clientName || !data.clientPhone) {
                return res.status(400).json({ error: 'Debe proporcionar clientId o clientName y clientPhone' });
            }

            // Limpiar el teléfono antes de procesar (remover formato visual)
            const cleanPhone = data.clientPhone.replace(/\D/g, '');

            // Buscar o crear cliente
            let client = await prisma.client.findUnique({
                where: { phone: cleanPhone }
            });

            if (!client) {
                // Hashear contraseña por defecto
                const defaultPassword = await bcrypt.hash('cliente123', 10);
                client = await prisma.client.create({
                    data: {
                        name: data.clientName,
                        phone: cleanPhone,
                        password: defaultPassword,
                        type: ClientType.PARTICULAR,
                    }
                });
            }

            clientId = client.id;
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                plate: data.plate,
                category,
                categoryId,
                clientId,
                notes: data.notes,
            },
            include: {
                client: true
            }
        });

        res.status(201).json(vehicle);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al crear el vehículo' });
    }
};

/**
 * POST /api/client/vehicles
 * Permite a un cliente crear su propio vehículo
 */
export const createClientVehicle = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        if (!clientId) {
            return res.status(401).json({ error: 'Cliente no autenticado' });
        }

        const data = createVehicleSchema.parse(req.body);

        // Verificar si el vehículo ya existe
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { plate: data.plate }
        });

        if (existingVehicle) {
            return res.status(400).json({ error: 'Ya existe un vehículo con esta placa' });
        }

        let category = data.category;
        let categoryId = data.categoryId;

        if (categoryId && !category) {
            const catModel = await prisma.vehicleCategoryModel.findUnique({
                where: { id: categoryId }
            });
            if (!catModel) {
                return res.status(400).json({ error: 'Categoría no encontrada' });
            }
            category = catModel.code as VehicleCategory;
        }

        if (!category) {
            return res.status(400).json({ error: 'Debe proporcionar una categoría válida' });
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                plate: data.plate,
                category,
                categoryId,
                clientId,
                notes: data.notes,
            }
        });


        res.status(201).json(vehicle);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al crear el vehículo' });
    }
};


/**
 * PATCH /api/vehicles/:id
 * Actualizar un vehículo
 */
export const updateVehicle = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateVehicleSchema.parse(req.body);

        // Verificar que el vehículo existe
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { id }
        });

        if (!existingVehicle) {
            return res.status(404).json({ error: 'Vehículo no encontrado' });
        }

        // Si se cambia la placa, verificar que no exista otra con esa placa
        if (data.plate && data.plate !== existingVehicle.plate) {
            const plateExists = await prisma.vehicle.findUnique({
                where: { plate: data.plate }
            });

            if (plateExists) {
                return res.status(400).json({ error: 'Ya existe otro vehículo con esta placa' });
            }
        }

        const vehicle = await prisma.vehicle.update({
            where: { id },
            data: {
                ...(data.plate && { plate: data.plate }),
                ...(data.category && { category: data.category }),
                ...(data.clientId && { clientId: data.clientId }),
                ...(data.notes !== undefined && { notes: data.notes }),
            },
            include: {
                client: true
            }
        });

        res.json(vehicle);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al actualizar el vehículo' });
    }
};

/**
 * DELETE /api/vehicles/:id
 * Eliminar un vehículo
 */
export const deleteVehicle = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Verificar que el vehículo existe
        const vehicle = await prisma.vehicle.findUnique({
            where: { id },
            include: {
                orders: {
                    where: {
                        status: {
                            not: 'COMPLETED'
                        }
                    }
                }
            }
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehículo no encontrado' });
        }

        // Verificar que no tenga órdenes activas
        if (vehicle.orders.length > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el vehículo porque tiene órdenes activas'
            });
        }

        await prisma.vehicle.delete({
            where: { id }
        });

        res.json({ message: 'Vehículo eliminado exitosamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al eliminar el vehículo' });
    }
};
