import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface UserContext {
    userId: string;
    roles: string[];
    email?: string;
    permissions?: string[];
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const rawRoles = decoded.roles ?? decoded.role ?? [];
            const roles = Array.isArray(rawRoles)
                ? rawRoles
                : typeof rawRoles === 'string'
                    ? rawRoles.split(',').map(r => r.trim()).filter(Boolean)
                    : [];
            (req as any).user = {
                userId: decoded.userId || decoded.sub,
                roles,
                email: decoded.email
            };
            next();
            return;
        } catch (error) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    }

    const headerUserId = Array.isArray(req.headers['x-user-id'])
        ? req.headers['x-user-id'][0]
        : req.headers['x-user-id'];
    if (!headerUserId || typeof headerUserId !== 'string') {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const headerRoles = Array.isArray(req.headers['x-user-roles'])
        ? req.headers['x-user-roles'][0]
        : req.headers['x-user-roles'];
    const roles = typeof headerRoles === 'string'
        ? headerRoles.split(',').map(r => r.trim()).filter(Boolean)
        : ['user'];

    (req as any).user = {
        userId: headerUserId,
        roles,
        email: Array.isArray(req.headers['x-user-email']) ? req.headers['x-user-email'][0] : req.headers['x-user-email']
    };
    next();
};

export const authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
        if (!hasRole) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};
