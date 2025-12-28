import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const searchClients = async (req: Request, res: Response) => {
    try {
        const { name } = req.query;

        // Si no hay nombre o está vacío, devolver todos los clientes (limitado a 100)
        if (!name || typeof name !== 'string' || name.trim() === '') {
            const clients = await prisma.client.findMany({
                take: 100,
                orderBy: {
                    name: 'asc'
                }
            });
            return res.json(clients);
        }

        const clients = await prisma.client.findMany({
            where: {
                name: {
                    contains: name,
                    mode: 'insensitive'
                }
            },
            take: 10,
            orderBy: {
                name: 'asc'
            }
        });

        res.json(clients);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al buscar clientes' });
    }
};
