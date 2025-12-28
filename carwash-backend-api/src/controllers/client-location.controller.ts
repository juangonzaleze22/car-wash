import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClientLocationService } from '../services/client-location.service';
import { z } from 'zod';

const createLocationSchema = z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    latitude: z.number(),
    longitude: z.number()
});

export const createLocation = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        if (!clientId) {
            return res.status(401).json({ error: 'Cliente no autenticado' });
        }

        const data = createLocationSchema.parse(req.body);
        const location = await ClientLocationService.create({
            ...data,
            clientId
        });

        res.status(201).json(location);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        res.status(500).json({ error: error.message });
    }
};

export const getMyLocations = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        if (!clientId) {
            return res.status(401).json({ error: 'Cliente no autenticado' });
        }

        const locations = await ClientLocationService.listByClient(clientId);
        res.json(locations);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteLocation = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        const { id } = req.params;

        if (!clientId) {
            return res.status(401).json({ error: 'Cliente no autenticado' });
        }

        await ClientLocationService.delete(id, clientId);
        res.json({ message: 'Ubicación eliminada exitosamente' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
