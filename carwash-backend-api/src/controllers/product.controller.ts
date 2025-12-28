import { Request, Response } from 'express';
import { PrismaClient, ExpenseCategory } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Esquemas de validación
const createProductSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().nullable().optional(),
    unit: z.string().min(1).max(20), // Ej: "LITROS", "UNIDADES"
    minStock: z.number().min(0),
    currentStock: z.number().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
    // Campos opcionales para generar un gasto automáticamente
    initialCost: z.number().min(0).optional(),
    currency: z.enum(['USD', 'VES']).optional().default('USD'),
    exchangeRate: z.number().positive().optional(),
});

const updateProductSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().nullable().optional(),
    unit: z.string().min(1).max(20).optional(),
    minStock: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
});

const stockAdjustmentSchema = z.object({
    productId: z.string().uuid(),
    quantity: z.number(), // Puede ser positivo (entrada) o negativo (salida)
    type: z.enum(['IN', 'OUT', 'ADJUST']),
    notes: z.string().optional(),
});

const dailyInventoryCheckSchema = z.object({
    items: z.array(z.object({
        productId: z.string().uuid(),
        actualStock: z.number().min(0),
    })),
    notes: z.string().optional()
});

/**
 * GET /api/products
 * Obtener todos los productos
 */
export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        const activeOnly = req.query.active === 'true';

        const where: any = {};
        if (activeOnly) {
            where.isActive = true;
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: {
                name: 'asc'
            }
        });

        res.json(products);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener productos' });
    }
};

/**
 * GET /api/products/:id
 * Obtener producto por ID
 */
export const getProductById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                movements: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdBy: {
                            select: { name: true, username: true }
                        }
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(product);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener producto' });
    }
};

/**
 * GET /api/products/:id/kardex
 * Obtener historial de movimientos (Kardex) de un producto
 */
export const getProductKardex = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where: { productId: id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    createdBy: {
                        select: { name: true, username: true }
                    },
                    expense: {
                        select: { id: true, description: true }
                    }
                }
            }),
            prisma.stockMovement.count({ where: { productId: id } })
        ]);

        res.json({
            data: movements,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener kardex' });
    }
};

/**
 * POST /api/products
 * Crear nuevo producto
 */
export const createProduct = async (req: AuthRequest, res: Response) => {
    try {
        const data = createProductSchema.parse(req.body);

        // Verificar nombre duplicado
        const existing = await prisma.product.findFirst({
            where: { name: { equals: data.name, mode: 'insensitive' } }
        });

        if (existing) {
            return res.status(400).json({ error: 'Ya existe un producto con este nombre' });
        }

        const product = await prisma.product.create({
            data
        });

        // Si inicia con stock > 0, crear movimiento inicial
        if (data.currentStock && data.currentStock > 0) {
            await prisma.stockMovement.create({
                data: {
                    productId: product.id,
                    type: 'ADJUST', // Ajuste inicial
                    quantity: data.currentStock,
                    previousStock: 0,
                    newStock: data.currentStock,
                    notes: 'Inventario Inicial',
                    createdById: req.user?.userId
                }
            });
        }

        res.status(201).json(product);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al crear producto' });
    }
};

/**
 * PATCH /api/products/:id
 * Actualizar producto
 */
export const updateProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateProductSchema.parse(req.body);

        const product = await prisma.product.update({
            where: { id },
            data
        });

        res.json(product);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al actualizar producto' });
    }
};

/**
 * POST /api/products/adjustment
 * Registrar movimiento manual de inventario (Entrada/Salida/Ajuste)
 */
export const createStockAdjustment = async (req: AuthRequest, res: Response) => {
    try {
        const data = stockAdjustmentSchema.parse(req.body);

        await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id: data.productId } });
            if (!product) throw new Error('Producto no encontrado');

            const currentStock = Number(product.currentStock);
            let newStock = currentStock;
            let quantity = data.quantity;

            // Calcular nuevo stock según tipo
            if (data.type === 'IN') {
                newStock += quantity;
            } else if (data.type === 'OUT') {
                newStock -= quantity;
                quantity = -quantity; // Guardar como negativo para consistencia
            } else if (data.type === 'ADJUST') {
                // En ajuste, quantity es el valor real de ajuste (+ o -)
                newStock = currentStock + quantity;
            }

            if (newStock < 0) {
                throw new Error('El stock no puede ser negativo');
            }

            // Actualizar producto
            await tx.product.update({
                where: { id: data.productId },
                data: { currentStock: newStock }
            });

            // Registrar movimiento
            await tx.stockMovement.create({
                data: {
                    productId: data.productId,
                    type: data.type,
                    quantity: quantity,
                    previousStock: currentStock,
                    newStock: newStock,
                    notes: data.notes,
                    createdById: req.user?.userId
                }
            });
        });

        res.json({ success: true });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(400).json({ error: error.message || 'Error al ajustar stock' });
    }
};

/**
 * POST /api/products/daily-check
 * Cierre de inventario (Supervisor reporta lo que ve físicamente)
 */
export const dailyInventoryCheck = async (req: AuthRequest, res: Response) => {
    try {
        const { items, notes } = dailyInventoryCheckSchema.parse(req.body);

        const movements: any[] = [];

        // Ejecutar todo en una transacción
        await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) continue;

                const currentStock = Number(product.currentStock);
                const actualStock = item.actualStock;
                const diff = actualStock - currentStock;

                // Solo registrar si hubo diferencia
                if (Math.abs(diff) > 0.001) { // Tolerancia pequeña para flotantes

                    // Actualizar producto
                    await tx.product.update({
                        where: { id: product.id },
                        data: { currentStock: actualStock }
                    });

                    // Registrar movimiento de ajuste diario
                    const movement = await tx.stockMovement.create({
                        data: {
                            productId: product.id,
                            type: 'DAILY_CHECK',
                            quantity: diff, // Puede ser negativo (pérdida/consumo) o positivo (hallazgo)
                            previousStock: currentStock,
                            newStock: actualStock,
                            notes: notes || 'Cierre de inventario diario',
                            createdById: req.user?.userId
                        }
                    });
                    movements.push(movement);
                }
            }
        });

        res.json({ success: true, movementsCount: movements.length });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al procesar inventario' });
    }
};
