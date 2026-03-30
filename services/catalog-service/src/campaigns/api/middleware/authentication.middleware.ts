/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';

type CampaignAuthenticatedRequest = Request & {
    user?: {
        userId?: string;
        id?: string;
    };
};

export function authenticate() {
    return (req: CampaignAuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Authentication required'
            });
            return;
        }
        next();
    };
}
