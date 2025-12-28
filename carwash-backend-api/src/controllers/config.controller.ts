import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as ConfigService from '../services/config.service';
import { z } from 'zod';

const updateConfigSchema = z.object({
    value: z.string(),
    description: z.string().optional(),
});

export const getConfigs = async (req: AuthRequest, res: Response) => {
    try {
        const configs = await ConfigService.getAllConfigs();
        res.json(configs);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener las configuraciones' });
    }
};

export const getConfigByKey = async (req: AuthRequest, res: Response) => {
    try {
        const { key } = req.params;
        const config = await ConfigService.getConfig(key);
        if (!config) return res.status(404).json({ error: 'Configuración no encontrada' });
        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener la configuración' });
    }
};

export const updateConfig = async (req: AuthRequest, res: Response) => {
    try {
        const { key } = req.params;
        const { value, description } = updateConfigSchema.parse(req.body);

        const config = await ConfigService.updateConfig(key, value, description);
        res.json(config);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: 'Error al actualizar la configuración' });
    }
};

export const getDeliveryFee = async (req: AuthRequest, res: Response) => {
    try {
        const fee = await ConfigService.getDeliveryFee();
        res.json({ deliveryFee: fee });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener el costo de delivery' });
    }
};
