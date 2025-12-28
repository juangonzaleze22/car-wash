import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
});

const clientLoginSchema = z.object({
    phone: z.string(),
    password: z.string(),
});

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.active) {
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }
};

/**
 * POST /api/auth/client-login
 * Login para clientes usando teléfono y contraseña
 */
export const clientLogin = async (req: Request, res: Response) => {
    try {
        const { phone, password } = clientLoginSchema.parse(req.body);

        // Limpiar el teléfono antes de buscar (remover formato visual)
        const cleanPhone = phone.replace(/\D/g, '');

        const client = await prisma.client.findUnique({ where: { phone: cleanPhone } });
        if (!client) {
            return res.status(401).json({ error: 'Teléfono no registrado' });
        }

        const validPassword = await bcrypt.compare(password, client.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: client.id, phone: client.phone, type: 'CLIENT' },
            JWT_SECRET,
            { expiresIn: '24h' } // Token más largo para clientes
        );

        return res.json({ 
            token, 
            client: { 
                id: client.id, 
                name: client.name, 
                phone: client.phone,
                type: client.type
            } 
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Datos inválidos', details: error.issues });
        }
        return res.status(400).json({ error: 'Error al iniciar sesión' });
    }
};
