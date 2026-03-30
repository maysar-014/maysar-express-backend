/**
 * Authorization Middleware
 */

import { Request, Response, NextFunction } from 'express';

type CampaignAuthenticatedRequest = Request & {
    user?: {
        role?: string;
    };
};

export function authorize(allowedRoles: string[]) {
    return (req: CampaignAuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = req.user;
        const role = user?.role;

        if (!user || !role || !allowedRoles.includes(role)) {
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
