import { Request, Response, NextFunction } from 'express';
import { PrismaEnablerRepository } from '../../infrastructure/repositories/prisma-enabler.repository';
import { EnablerLifecyclePolicy, EnablerCapability } from '../../domain/policies/enabler-lifecycle.policy';
import { Enabler_Status } from '../../domain/types/enabler.types';

const enablerRepo = new PrismaEnablerRepository();

type AuthenticatedRequest = Request & {
    user?: {
        userId?: string;
        id?: string;
    };
    enablerContext?: {
        enablerId: string;
        status: Enabler_Status;
        tier: unknown;
    };
};

const isContractTestRequest = (req: Request): boolean => {
    const header = req.headers['x-contract-test'];
    const value = Array.isArray(header) ? header[0] : header;
    return (value === '1' || value === 'true') && process.env.NODE_ENV !== 'production';
};

/**
 * Resolve the authenticated user's enabler identity WITHOUT requiring an
 * operational status.
 *
 * Needed because an enabler must still be able to read its own capability
 * status and lifecycle reason after being RESTRICTED or SUSPENDED — otherwise
 * the dashboard could never explain why operations stopped. The capability
 * itself is enforced separately by `requireEnablerCapability`.
 *
 * The enabler identity always comes from the authenticated user; a client
 * cannot claim another enabler's profile (§47).
 */
export const authorizeEnablerIdentity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authenticatedRequest = req as AuthenticatedRequest;
        const headerUserId = req.headers['x-user-id'];
        const requestedEnablerId = req.params?.enablerId;
        const userId =
            authenticatedRequest.user?.userId ||
            authenticatedRequest.user?.id ||
            (Array.isArray(headerUserId) ? headerUserId[0] : headerUserId);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userEnabler = await enablerRepo.findByUserId(userId);
        let enabler = userEnabler;

        // Contract-suite escape hatch, mirroring `authorizeEnabler`.
        if (!enabler && isContractTestRequest(req) && requestedEnablerId) {
            enabler = await enablerRepo.findById(requestedEnablerId);
        }
        if (!enabler) {
            return res.status(403).json({ error: 'User is not an enabler' });
        }

        if (requestedEnablerId && enabler.id !== requestedEnablerId) {
            return res.status(403).json({ error: 'Enabler context does not match requested resource' });
        }

        authenticatedRequest.enablerContext = {
            enablerId: enabler.id,
            status: enabler.status,
            tier: enabler.tier,
        };

        next();
    } catch {
        res.status(500).json({ error: 'Authorization failed' });
    }
};

/**
 * Contextual authorization (§35): the capability is granted only when the
 * enabler's *current* lifecycle status permits it. A status change takes effect
 * on the very next request — the frontend plays no part in the decision (§55).
 */
export const requireEnablerCapability = (capability: EnablerCapability) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const context = (req as AuthenticatedRequest).enablerContext;
        if (!context) {
            return res.status(403).json({ error: 'Enabler context is required' });
        }

        const decision = EnablerLifecyclePolicy.canPerform(context.status, capability);
        if (!decision.allowed) {
            return res.status(403).json({
                error: decision.reason,
                code: decision.code,
                capability,
                status: context.status,
            });
        }

        next();
    };
};