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

export const getBranding = async (req: any, res: Response) => {
    try {
        const nameConfig = await ConfigService.getConfig('BUSINESS_NAME');
        const logoConfig = await ConfigService.getConfig('BUSINESS_LOGO');

        res.json([
            nameConfig,
            logoConfig
        ].filter(Boolean));
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener branding' });
    }
};

export const updateSystemConfig = async (req: AuthRequest, res: Response) => {
    try {
        const { key } = req.params;
        let value: string;
        let description: string | undefined;

        // Standard config update (removed req.file logic which belongs to uploadLogo)
        const validatedData = updateConfigSchema.parse(req.body);
        value = validatedData.value;
        description = validatedData.description;

        const config = await ConfigService.updateConfig(key, value, description);
        res.json(config);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('Error updating config:', error);
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

export const uploadLogo = async (req: AuthRequest, res: Response) => {
    console.log('Entering uploadLogo controller');
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }

        const value = `/uploads/branding/${req.file.filename}`;
        const description = req.body.description || 'Logo del negocio';

        const config = await ConfigService.updateConfig('BUSINESS_LOGO', value, description);
        res.json(config);
    } catch (error: any) {
        console.error('Error uploading logo:', error);
        res.status(500).json({ error: 'Error al subir el logo' });
    }
};
