import { Request, Response } from 'express';
import * as WasherService from '../services/washer.service';
import { z } from 'zod';
import { WasherEarningStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const getEarningsSchema = z.object({
    washerId: z.string().uuid().optional(),
    orderId: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(WasherEarningStatus).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

const markAsPaidSchema = z.object({
    earningIds: z.array(z.string().uuid()).min(1),
    paidAt: z.coerce.date().optional(),
});

/**
 * GET /api/washers/earnings
 * Obtiene las ganancias de los lavadores (admin puede ver todas, lavador solo las suyas)
 */
export const getWasherEarnings = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        const params = getEarningsSchema.parse(req.query);

        // Si es un lavador, solo puede ver sus propias ganancias
        if (user?.role === 'WASHER') {
            params.washerId = user.id;
        }

        const result = await WasherService.getWasherEarnings(params);
        res.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al obtener las ganancias' });
    }
};

/**
 * GET /api/washers/my-earnings
 * Obtiene las ganancias del lavador autenticado
 */
export const getMyEarnings = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'WASHER') {
            return res.status(403).json({ error: 'Solo los lavadores pueden acceder a esta ruta' });
        }

        const params = getEarningsSchema.parse(req.query);
        params.washerId = user.id;

        const result = await WasherService.getWasherEarnings(params);
        res.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al obtener las ganancias' });
    }
};

/**
 * GET /api/washers/my-earnings/summary
 * Obtiene el resumen de ganancias del lavador autenticado
 */
export const getMyEarningsSummary = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || user.role !== 'WASHER') {
            return res.status(403).json({ error: 'Solo los lavadores pueden acceder a esta ruta' });
        }

        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const summary = await WasherService.getWasherEarningsSummary(user.id, startDate, endDate);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener el resumen de ganancias' });
    }
};

/**
 * GET /api/washers/:id/earnings
 * Obtiene las ganancias de un lavador específico (solo admin)
 */
export const getWasherEarningsById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const params = getEarningsSchema.parse(req.query);
        params.washerId = id;

        const result = await WasherService.getWasherEarnings(params);
        res.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al obtener las ganancias' });
    }
};

/**
 * GET /api/washers/earnings/summary
 * Obtiene el resumen general de ganancias (solo admin)
 */
export const getAllWashersEarningsSummary = async (req: AuthRequest, res: Response) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const summary = await WasherService.getAllWashersEarningsSummary(startDate, endDate);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Error al obtener el resumen de ganancias' });
    }
};

/**
 * POST /api/washers/earnings/mark-as-paid
 * Marca ganancias como pagadas (solo admin)
 */
export const markEarningsAsPaid = async (req: AuthRequest, res: Response) => {
    try {
        const data = markAsPaidSchema.parse(req.body);
        const result = await WasherService.markEarningsAsPaid(data.earningIds, data.paidAt);
        res.json({
            message: `${result.count} ganancia(s) marcada(s) como pagada(s)`,
            count: result.count,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message || 'Error al marcar las ganancias como pagadas' });
    }
};

