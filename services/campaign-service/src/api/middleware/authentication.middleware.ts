/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';

export function authenticate() {
    return (req: Request, res: Response, next: NextFunction) => {
        // In a real scenario, this would verify JWT or session
        // For now, we assume user is attached by a global middleware or mock it
        if (!(req as any).user) {
            // Mock user for development if not present
            (req as any).user = { id: 'dev-user-id', role: 'admin' };
        }
        next();
    };
}
