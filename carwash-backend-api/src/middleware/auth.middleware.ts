import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export interface AuthRequest extends Request {
    user?: any;
    client?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        
        // Si es un cliente (tiene type: 'CLIENT')
        if (decoded.type === 'CLIENT') {
            req.client = decoded;
        } else {
            // Si es un usuario del sistema
            req.user = decoded;
        }
        next();
    });
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tiene permisos para realizar esta acción' });
        }
        next();
    };
};

/**
 * Middleware para requerir autenticación de cliente
 */
export const requireClient = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.client || req.client.type !== 'CLIENT') {
        return res.status(403).json({ error: 'Acceso solo para clientes' });
    }
    next();
};
