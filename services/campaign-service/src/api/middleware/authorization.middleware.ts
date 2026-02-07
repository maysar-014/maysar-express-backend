/**
 * Authorization Middleware
 */

import { Request, Response, NextFunction } from 'express';

export function authorize(allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user || !allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to access this resource'
                }
            });
        }

        next();
    };
}
