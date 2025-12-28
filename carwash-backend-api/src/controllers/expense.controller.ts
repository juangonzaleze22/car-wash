import { Request, Response } from 'express';
import { PrismaClient, ExpenseCategory, RecurrenceFrequency } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const createExpenseSchema = z.object({
    description: z.string().min(1),
    category: z.nativeEnum(ExpenseCategory),
    amount: z.number().positive(),
    currency: z.enum(['USD', 'VES']),
    exchangeRate: z.number().positive().optional(),
    notes: z.string().nullable().optional(),
    isRecurring: z.boolean().optional().default(false),
    recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).optional(),
    recurrenceStartDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

const updateExpenseSchema = z.object({
    description: z.string().min(1).optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    amount: z.number().positive().optional(),
    currency: z.enum(['USD', 'VES']).optional(),
    exchangeRate: z.number().positive().optional(),
    notes: z.string().nullable().optional(),
    isRecurring: z.boolean().optional(),
    recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).optional(),
    recurrenceStartDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

/**
 * GET /api/expenses
 * Obtener todos los gastos con paginación y filtros
 */
export const getExpenses = async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const category = req.query.category as ExpenseCategory | undefined;
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        // Manejar el filtro de isRecurring: puede ser 'true', 'false', o undefined
        let isRecurringFilter: boolean | undefined = undefined;
        if (req.query.isRecurring !== undefined && req.query.isRecurring !== null) {
            const isRecurringStr = String(req.query.isRecurring).toLowerCase().trim();
            if (isRecurringStr === 'true') {
                isRecurringFilter = true;
            } else if (isRecurringStr === 'false') {
                isRecurringFilter = false;
            }
        }

        const where: any = {};
        if (category) {
            where.category = category;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }
        if (isRecurringFilter !== undefined) {
            // Filtrar por isRecurring: true o false
            if (isRecurringFilter === false) {
                // Para false, usar NOT para excluir los que son true
                // Esto incluirá tanto false como null
                where.NOT = {
                    isRecurring: true
                };
            } else {
                // Para true, solo los que son explícitamente true
                where.isRecurring = true;
            }
        }

        const [expenses, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            prisma.expense.count({ where }),
        ]);

        res.json({
            expenses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/expenses/:id
 * Obtener un gasto por ID
 */
export const getExpenseById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const expense = await prisma.expense.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });
        if (!expense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }
        res.json(expense);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/expenses
 * Crear un nuevo gasto
 */
export const createExpense = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const data = createExpenseSchema.parse(req.body);

        // Validar recurrencia
        if (data.isRecurring && !data.recurrenceFrequency) {
            return res.status(400).json({ error: 'Se requiere frecuencia de recurrencia para gastos recurrentes' });
        }

        // Calcular amountUSD
        let amountUSD = data.amount;
        if (data.currency === 'VES') {
            // Obtener tasa de cambio actual para validación de seguridad
            let currentExchangeRate: number;
            try {
                const { getExchangeRates } = await import('../services/exchange-rate.service');
                const rates = await getExchangeRates();
                currentExchangeRate = rates.usd.average;
            } catch (error) {
                console.error('Error al obtener tasa de cambio para gasto:', error);
                return res.status(500).json({
                    error: 'No se pudo obtener la tasa de cambio actual. Por favor, intente nuevamente.'
                });
            }

            // Validar que la tasa proporcionada coincida con la actual (seguridad)
            if (data.exchangeRate) {
                const TOLERANCE_PERCENT = 2; // Tolerancia del 2% para diferencias menores
                const tolerance = currentExchangeRate * (TOLERANCE_PERCENT / 100);
                const difference = Math.abs(data.exchangeRate - currentExchangeRate);

                if (difference > tolerance) {
                    return res.status(400).json({
                        error: `La tasa de cambio proporcionada (${data.exchangeRate}) no coincide con la tasa actual (${currentExchangeRate.toFixed(2)}). Por favor, recargue la página e intente nuevamente.`
                    });
                }
            }

            // Usar la tasa actual (redondeada a 2 decimales) para consistencia
            const exchangeRate = Math.round(currentExchangeRate * 100) / 100;
            amountUSD = data.amount / exchangeRate;
            // Actualizar data.exchangeRate con la tasa validada
            data.exchangeRate = exchangeRate;
        }

        // Calcular nextDueDate si es recurrente
        let nextDueDate: Date | undefined = undefined;
        if (data.isRecurring && data.recurrenceFrequency) {
            nextDueDate = calculateNextDueDate(new Date(), data.recurrenceFrequency);
        }

        const expense = await prisma.expense.create({
            data: {
                description: data.description,
                category: data.category,
                amount: data.amount,
                currency: data.currency,
                exchangeRate: data.exchangeRate,
                amountUSD: amountUSD,
                notes: data.notes,
                isRecurring: data.isRecurring || false,
                recurrenceFrequency: data.recurrenceFrequency || null,
                nextDueDate: nextDueDate,
                createdById: user.id,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });
        res.status(201).json(expense);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message });
    }
};

/**
 * PATCH /api/expenses/:id
 * Actualizar un gasto
 */
export const updateExpense = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateExpenseSchema.parse(req.body);

        const existingExpense = await prisma.expense.findUnique({
            where: { id },
        });
        if (!existingExpense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        // Calcular amountUSD si se actualiza amount o currency
        let updateData: any = { ...data };
        if (data.amount !== undefined || data.currency !== undefined || data.exchangeRate !== undefined) {
            const finalAmount = data.amount ?? existingExpense.amount;
            const finalCurrency = data.currency ?? existingExpense.currency;
            const finalExchangeRate = data.exchangeRate ?? existingExpense.exchangeRate;

            let amountUSD = Number(finalAmount);

            if (finalCurrency === 'VES') {
                // Obtener tasa de cambio actual para validación de seguridad
                let currentExchangeRate: number;
                try {
                    const { getExchangeRates } = await import('../services/exchange-rate.service');
                    const rates = await getExchangeRates();
                    currentExchangeRate = rates.usd.average;
                } catch (error) {
                    console.error('Error al obtener tasa de cambio para actualizar gasto:', error);
                    return res.status(500).json({
                        error: 'No se pudo obtener la tasa de cambio actual. Por favor, intente nuevamente.'
                    });
                }

                // Validar que la tasa proporcionada coincida con la actual (seguridad)
                if (data.exchangeRate) {
                    const TOLERANCE_PERCENT = 2; // Tolerancia del 2% para diferencias menores
                    const tolerance = currentExchangeRate * (TOLERANCE_PERCENT / 100);
                    const difference = Math.abs(data.exchangeRate - currentExchangeRate);

                    if (difference > tolerance) {
                        return res.status(400).json({
                            error: `La tasa de cambio proporcionada (${data.exchangeRate}) no coincide con la tasa actual (${currentExchangeRate.toFixed(2)}). Por favor, recargue la página e intente nuevamente.`
                        });
                    }
                }

                // Usar siempre la tasa actual del servicio (redondeada a 2 decimales) para consistencia y seguridad
                const finalExchangeRateToUse = Math.round(currentExchangeRate * 100) / 100;
                amountUSD = Number(finalAmount) / finalExchangeRateToUse;

                // Actualizar exchangeRate con la tasa validada del servicio
                updateData.exchangeRate = finalExchangeRateToUse;
            }

            updateData.amountUSD = amountUSD;
        }

        // Manejar recurrencia
        if (data.isRecurring !== undefined || data.recurrenceFrequency !== undefined || data.recurrenceStartDate !== undefined) {
            const isRecurring = data.isRecurring ?? existingExpense.isRecurring;
            const frequency = data.recurrenceFrequency ?? existingExpense.recurrenceFrequency;
            const startDate = data.recurrenceStartDate ?? existingExpense.recurrenceStartDate;

            if (isRecurring && !frequency) {
                return res.status(400).json({ error: 'Se requiere frecuencia de recurrencia para gastos recurrentes' });
            }

            updateData.isRecurring = isRecurring;
            updateData.recurrenceFrequency = frequency || null;
            updateData.recurrenceStartDate = startDate || null;

            // Calcular nextDueDate si se activa la recurrencia o cambia la frecuencia o fecha de inicio
            if (isRecurring && frequency) {
                const baseDate = startDate || existingExpense.recurrenceStartDate || new Date();
                if (!existingExpense.nextDueDate ||
                    data.recurrenceFrequency !== undefined ||
                    data.recurrenceStartDate !== undefined) {
                    updateData.nextDueDate = calculateNextDueDate(baseDate, frequency);
                }
            } else {
                updateData.nextDueDate = null;
                updateData.recurrenceStartDate = null;
            }
        }

        const expense = await prisma.expense.update({
            where: { id },
            data: updateData,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });
        res.json(expense);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message });
    }
};

/**
 * DELETE /api/expenses/:id
 * Eliminar un gasto
 */
export const deleteExpense = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const existingExpense = await prisma.expense.findUnique({
            where: { id },
        });
        if (!existingExpense) {
            return res.status(404).json({ error: 'Gasto no encontrado' });
        }

        await prisma.expense.delete({
            where: { id },
        });
        res.json({ message: 'Gasto eliminado exitosamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Helper function to calculate next due date based on frequency
 */
function calculateNextDueDate(currentDate: Date, frequency: RecurrenceFrequency): Date {
    const nextDate = new Date(currentDate);
    switch (frequency) {
        case 'WEEKLY':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'MONTHLY':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'QUARTERLY':
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
        case 'YEARLY':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
    }
    return nextDate;
}

/**
 * POST /api/expenses/:id/generate-next
 * Generar el siguiente gasto recurrente basado en una plantilla
 */
export const generateNextRecurringExpense = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const { id } = req.params;
        const template = await prisma.expense.findUnique({
            where: { id },
        });

        if (!template) {
            return res.status(404).json({ error: 'Gasto plantilla no encontrado' });
        }

        if (!template.isRecurring || !template.recurrenceFrequency) {
            return res.status(400).json({ error: 'Este gasto no es recurrente' });
        }

        // Verificar si ya existe un gasto generado para esta fecha
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (template.nextDueDate) {
            const dueDate = new Date(template.nextDueDate);
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate > today) {
                return res.status(400).json({
                    error: `El siguiente gasto está programado para ${dueDate.toLocaleDateString('es-ES')}`
                });
            }
        }

        // Crear el nuevo gasto basado en la plantilla
        const newExpense = await prisma.expense.create({
            data: {
                description: template.description,
                category: template.category,
                amount: template.amount,
                currency: template.currency,
                exchangeRate: template.exchangeRate,
                amountUSD: template.amountUSD,
                notes: template.notes,
                isRecurring: false, // El gasto generado no es recurrente
                recurrenceTemplateId: template.id,
                createdById: user.id,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        // Actualizar nextDueDate de la plantilla
        const nextDueDate = calculateNextDueDate(
            template.nextDueDate || new Date(),
            template.recurrenceFrequency
        );

        await prisma.expense.update({
            where: { id: template.id },
            data: { nextDueDate },
        });

        res.status(201).json({
            expense: newExpense,
            nextDueDate,
            message: 'Gasto recurrente generado exitosamente',
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/expenses/recurring/pending
 * Obtener gastos recurrentes pendientes de generar
 */
export const getPendingRecurringExpenses = async (req: AuthRequest, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pendingExpenses = await prisma.expense.findMany({
            where: {
                isRecurring: true,
                nextDueDate: {
                    lte: today,
                },
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
            orderBy: {
                nextDueDate: 'asc',
            },
        });

        res.json({ expenses: pendingExpenses });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/expenses/recurring/upcoming
 * Obtener gastos recurrentes ordenados por fecha de vencimiento
 */
export const getUpcomingRecurringExpenses = async (req: AuthRequest, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

        const upcomingExpenses = await prisma.expense.findMany({
            where: {
                isRecurring: true,
                nextDueDate: { not: null },
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
            orderBy: {
                nextDueDate: 'asc',
            },
            take: limit,
        });

        res.json({ expenses: upcomingExpenses });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/expenses/summary
 * Obtener resumen de gastos por categoría y período
 */
export const getExpensesSummary = async (req: AuthRequest, res: Response) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const where: any = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = startDate;
            }
            if (endDate) {
                where.createdAt.lte = endDate;
            }
        }

        // Total de gastos
        const totalExpenses = await prisma.expense.aggregate({
            where,
            _sum: {
                amountUSD: true,
            },
            _count: {
                id: true,
            },
        });

        // Gastos por categoría
        const expensesByCategory = await prisma.expense.groupBy({
            by: ['category'],
            where,
            _sum: {
                amountUSD: true,
            },
            _count: {
                id: true,
            },
        });

        res.json({
            totalExpenses: Number(totalExpenses._sum.amountUSD || 0),
            totalCount: totalExpenses._count.id,
            byCategory: expensesByCategory.map((item) => ({
                category: item.category,
                total: Number(item._sum.amountUSD || 0),
                count: item._count.id,
            })),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

