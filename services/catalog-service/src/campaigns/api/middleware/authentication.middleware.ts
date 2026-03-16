/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';

export function authenticate() {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!(req as any).user) {
            res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Authentication required'
            });
            return;
        }
        next();
    };
}
