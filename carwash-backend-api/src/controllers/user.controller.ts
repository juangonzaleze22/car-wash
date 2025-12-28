import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

const createWasherSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
    name: z.string().nullable().optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const updateWasherSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').optional(),
    name: z.string().optional().nullable(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    active: z.boolean().optional(),
});

/**
 * GET /api/users/washers
 * Obtener todos los lavadores (incluyendo inactivos)
 */
export const getWashers = async (req: Request, res: Response) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';

        const washers = await prisma.user.findMany({
            where: {
                role: UserRole.WASHER,
                ...(includeInactive ? {} : { active: true })
            },
            select: {
                id: true,
                username: true,
                name: true,
                active: true
            },
            orderBy: [
                { name: 'asc' },
                { username: 'asc' }
            ]
        });
        res.json(washers);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener lavadores' });
    }
};

/**
 * POST /api/users/washers
 * Crear un nuevo lavador
 */
export const createWasher = async (req: Request, res: Response) => {
    try {
        const data = createWasherSchema.parse(req.body);

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { username: data.username }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const washer = await prisma.user.create({
            data: {
                username: data.username,
                name: data.name || null,
                password: hashedPassword,
                role: UserRole.WASHER,
                active: true
            },
            select: {
                id: true,
                username: true,
                name: true,
                active: true
            }
        });

        res.status(201).json(washer);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(500).json({ error: 'Error al crear el lavador' });
    }
};

/**
 * PATCH /api/users/washers/:id
 * Actualizar un lavador
 */
export const updateWasher = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = updateWasherSchema.parse(req.body);

        // Verificar si el lavador existe y es un lavador
        const existingWasher = await prisma.user.findUnique({
            where: { id }
        });

        if (!existingWasher) {
            return res.status(404).json({ error: 'Lavador no encontrado' });
        }

        if (existingWasher.role !== UserRole.WASHER) {
            return res.status(400).json({ error: 'El usuario no es un lavador' });
        }

        // Si se está actualizando el username, verificar que no exista otro con ese nombre
        if (data.username && data.username !== existingWasher.username) {
            const usernameExists = await prisma.user.findUnique({
                where: { username: data.username }
            });

            if (usernameExists) {
                return res.status(400).json({ error: 'El nombre de usuario ya existe' });
            }
        }

        // Preparar datos de actualización
        const updateData: any = {};
        if (data.username) updateData.username = data.username;
        if (data.name !== undefined) updateData.name = data.name || null;
        if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
        if (data.active !== undefined) updateData.active = data.active;

        const updatedWasher = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                username: true,
                name: true,
                active: true
            }
        });

        res.json(updatedWasher);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(500).json({ error: 'Error al actualizar el lavador' });
    }
};

/**
 * DELETE /api/users/washers/:id
 * Desactivar un lavador (soft delete)
 */
export const deleteWasher = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Verificar si el lavador existe y es un lavador
        const existingWasher = await prisma.user.findUnique({
            where: { id }
        });

        if (!existingWasher) {
            return res.status(404).json({ error: 'Lavador no encontrado' });
        }

        if (existingWasher.role !== UserRole.WASHER) {
            return res.status(400).json({ error: 'El usuario no es un lavador' });
        }

        // Desactivar en lugar de eliminar
        const updatedWasher = await prisma.user.update({
            where: { id },
            data: { active: false },
            select: {
                id: true,
                username: true,
                name: true,
                active: true
            }
        });

        res.json(updatedWasher);
    } catch (error) {
        res.status(500).json({ error: 'Error al desactivar el lavador' });
    }
};
