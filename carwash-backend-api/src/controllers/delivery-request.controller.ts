import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as DeliveryRequestService from '../services/delivery-request.service';
import { z } from 'zod';

const createRequestSchema = z.object({
    vehicleId: z.string().uuid(),
    address: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    services: z.array(z.object({
        serviceId: z.string().uuid(),
        name: z.string(),
        price: z.number()
    })).min(1),
    totalAmount: z.number(),
    notes: z.string().optional(),
});

const updateStatusSchema = z.object({
    status: z.enum(['ACCEPTED', 'REJECTED']),
    cancellationReason: z.string().optional(),
});

export const createRequest = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        if (!clientId) return res.status(401).json({ error: 'Cliente no autenticado' });

        const data = createRequestSchema.parse(req.body);
        const request = await DeliveryRequestService.createRequest({
            ...data,
            clientId
        });

        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al crear la solicitud' });
    }
};

export const getPendingRequests = async (req: AuthRequest, res: Response) => {
    try {
        const requests = await DeliveryRequestService.getPendingRequests();
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener las solicitudes' });
    }
};

export const getMyRequests = async (req: AuthRequest, res: Response) => {
    try {
        const clientId = req.client?.id;
        if (!clientId) return res.status(401).json({ error: 'Cliente no autenticado' });

        const requests = await DeliveryRequestService.getRequestsByClient(clientId);
        res.json(requests);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener tus solicitudes' });
    }
};

export const getRequestById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const request = await DeliveryRequestService.getRequestById(id);
        if (!request) return res.status(404).json({ error: 'Solicitud no encontrada' });
        res.json(request);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener la solicitud' });
    }
};

export const updateRequestStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const supervisorId = req.user?.id;
        if (!supervisorId) return res.status(401).json({ error: 'Usuario no autenticado' });

        const { status, cancellationReason } = updateStatusSchema.parse(req.body);
        const request = await DeliveryRequestService.updateRequestStatus(id, status as any, supervisorId, cancellationReason);

        res.json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al actualizar la solicitud' });
    }
};
