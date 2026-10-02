import { Router } from 'express';
import Joi from 'joi';
import { joiId } from '@shared/validation/id';
import { PayoutController } from '../controllers/payout.controller';
import { AuthorizationMiddleware } from '../middleware/authorization.middleware';
import { asyncHandler } from '@shared/middleware/async-handler';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';
import { requireKycLevel } from '../../../../kyc-service/src/api/middleware/kyc-gate.middleware';

const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F]+$/u;
const safeVisibleString = Joi.string().trim().min(1).pattern(SAFE_VISIBLE_STRING_PATTERN);
const payoutIdParamsSchema = Joi.object({
    id: joiId().required()
}).unknown(false);
const payoutInitiateBodySchema = Joi.object({
    userId: joiId().optional(),
    userRole: safeVisibleString.optional(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().required(),
    method: Joi.string().valid('BANK_TRANSFER', 'MOBILE_MONEY', 'WALLET').required(),
    bankDetails: Joi.object({
        bankName: safeVisibleString.required(),
        bankCode: safeVisibleString.required(),
        accountNumber: safeVisibleString.required(),
        accountName: safeVisibleString.required(),
        branchCode: safeVisibleString.optional()
    }).optional(),
    mobileMoneyDetails: Joi.object({
        provider: safeVisibleString.required(),
        phoneNumber: Joi.string().trim().pattern(/^\+?\d{7,15}$/).required(),
        accountName: safeVisibleString.required()
    }).optional(),
    availableBalance: Joi.number().optional(),
    userStatus: safeVisibleString.optional(),
    lastPayoutDate: Joi.date().iso().optional()
}).unknown(false);
const payoutCancelBodySchema = Joi.object({
    reason: safeVisibleString.optional()
}).unknown(false);
const payoutUserParamsSchema = Joi.object({
    userId: joiId().required()
}).unknown(false);

/**
 * Ownership guard for user-scoped payout reads: a caller may read their own
 * payout history; admin/system callers may read any user's history. This
 * mirrors the wallet-service `authorizeWalletAccess` rule so the payout
 * history cannot be enumerated across users (IDOR).
 */
const requireSelfOrAdmin = (req: any, res: any, next: any): void => {
    const user = req.user;
    if (!user || !user.userId) {
        res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
    }

    const roles = [...(Array.isArray(user.roles) ? user.roles : []), user.role]
        .filter(Boolean)
        .map((role: unknown) => String(role).trim().toLowerCase());

    if (roles.includes('admin') || roles.includes('system')) {
        next();
        return;
    }

    if (user.userId === req.params.userId) {
        next();
        return;
    }

    res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only view your own payout history' }
    });
};

export function createPayoutRoutes(controller: PayoutController): Router {
    const router = Router();

    router.post(
        '/',
        AuthorizationMiddleware.authorizeRoles(['seller', 'supplier', 'courier', 'enabler', 'system']),
        requireKycLevel(2), // Payouts require identity verification — applies to all roles including suppliers
        validateJoiRequest({ body: payoutInitiateBodySchema }),
        asyncHandler(controller.initiate.bind(controller))
    );
    router.get('/', asyncHandler(controller.list.bind(controller)));
    router.get(
        '/user/:userId',
        requireSelfOrAdmin,
        validateJoiRequest({ params: payoutUserParamsSchema }),
        asyncHandler(controller.listByUser.bind(controller))
    );
    router.get('/:id', validateJoiRequest({ params: payoutIdParamsSchema }), asyncHandler(controller.getPayout.bind(controller)));
    router.post(
        '/:id/cancel',
        validateJoiRequest({ params: payoutIdParamsSchema, body: payoutCancelBodySchema }),
        asyncHandler(controller.cancel.bind(controller))
    );

    return router;
}
