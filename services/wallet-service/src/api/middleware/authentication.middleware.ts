import { Request, Response, NextFunction } from 'express';

/**
 * Mock Authentication Middleware
 * In a real-world scenario, this would verify a JWT or session
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
    // For now, we'll try to get user from headers or mock it if not present
    // This allows testing without a full auth integration
    const userId = req.headers['x-user-id'] as string;
    const userRoles = (req.headers['x-user-roles'] as string || 'USER').split(',');

    if (userId) {
        (req as any).user = {
            id: userId,
            roles: userRoles
        };
    } else {
        // Default mock user for development
        (req as any).user = {
            id: 'mock-user-id',
            roles: ['USER']
        };
    }

    next();
};
