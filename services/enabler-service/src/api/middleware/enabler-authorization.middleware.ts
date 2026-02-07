import { Request, Response, NextFunction } from 'express';
import { PrismaEnablerRepository } from '../../infrastructure/repositories/prisma-enabler.repository';

const enablerRepo = new PrismaEnablerRepository();

export const authorizeEnabler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.headers['x-user-id'] as string; // From gateway
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const enabler = await enablerRepo.findByUserId(userId);
        if (!enabler) {
            return res.status(403).json({ error: 'User is not an enabler' });
        }

        if (enabler.status !== 'ACTIVE' && enabler.status !== 'APPROVED') {
            return res.status(403).json({ error: 'Enabler account is not active' });
        }

        // Attach enabler context to request
        (req as any).enablerContext = {
            enablerId: enabler.id,
            tier: enabler.tier
        };

        next();
    } catch (error) {
        res.status(500).json({ error: 'Authorization failed' });
    }
};
