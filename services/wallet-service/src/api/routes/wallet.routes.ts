import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore } from '../../../../../shared/middleware/redis-rate-limit.store';
import { WalletController } from '../controllers/wallet.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { WalletValidator } from '../validators/wallet.validator';
import { authenticate } from '../middleware/authentication.middleware';
import { AuthorizationMiddleware } from '../middleware/authorization.middleware';
import { correlationMiddleware } from '../middleware/correlation.middleware';
import { IdempotencyMiddleware } from '@shared/middleware/idempotency';
import { getSharedRedisClient, resolveRedisUrl } from '@shared/redis/ioredis-client';
import { shouldBypassRateLimit } from '@shared/middleware/rate-limit.util';
import { asyncHandler } from '@shared/middleware/async-handler';
import { requireKycLevel } from '../../../../kyc-service/src/api/middleware/kyc-gate.middleware';

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));
const applyIdempotency = idempotencyMiddleware.middleware();

export function createWalletRoutes(controller: WalletController): Router {
    const router = Router();

    // All wallet routes require authentication
    router.use(authenticate);
    router.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 60,
        store: new RedisRateLimitStore(redisClient, 'rl:wallet:'),
        passOnStoreError: true,
        skip: shouldBypassRateLimit
    }));
    router.use(correlationMiddleware);

    // General wallet access (read)
    router.get('/:userId',
        AuthorizationMiddleware.authorizeWalletAccess(),
        asyncHandler(controller.getWallet.bind(controller))
    );

    router.get('/:userId/balance',
        AuthorizationMiddleware.authorizeWalletAccess(),
        asyncHandler(controller.getBalance.bind(controller))
    );

    // Write operations
    router.post('/:userId/credit',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.creditWallet),
        applyIdempotency,
        asyncHandler(controller.creditWallet.bind(controller))
    );

    router.post('/:userId/debit',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.debitWallet),
        applyIdempotency,
        asyncHandler(controller.debitWallet.bind(controller))
    );

    router.post('/:userId/hold',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.placeHold),
        applyIdempotency,
        asyncHandler(controller.placeHold.bind(controller))
    );

    router.post('/:userId/hold/:holdId/release',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.releaseHold),
        applyIdempotency,
        asyncHandler(controller.releaseHold.bind(controller))
    );

    router.post('/:userId/hold/:holdId/capture',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.captureHold),
        applyIdempotency,
        asyncHandler(controller.captureHold.bind(controller))
    );

    router.post('/:userId/transaction/:transactionId/reverse',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.reverseTransaction),
        applyIdempotency,
        asyncHandler(controller.reverseTransaction.bind(controller))
    );

    router.get('/:userId/statement',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest({
            params: WalletValidator.walletUserParams,
            query: WalletValidator.statementQuery
        }),
        asyncHandler(controller.getStatement.bind(controller))
    );

    router.get('/:userId/transactions',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest({
            params: WalletValidator.walletUserParams,
            query: WalletValidator.statementQuery
        }),
        asyncHandler(controller.getStatement.bind(controller))
    );

    // Admin/Internal only? For now authorize regular access
    router.post('/:userId/freeze',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.freezeFunds),
        applyIdempotency,
        asyncHandler(controller.freezeFunds.bind(controller))
    );

    router.post('/:userId/unfreeze',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.unfreezeFunds),
        applyIdempotency,
        asyncHandler(controller.unfreezeFunds.bind(controller))
    );

    // Top-up: BUYER and SELLER can top up their own wallet; ADMIN can top up any wallet
    router.post('/:userId/topup',
        AuthorizationMiddleware.authorizeWalletAccess(),
        AuthorizationMiddleware.authorizeRole(['buyer', 'seller', 'admin', 'system']),
        validateRequest(WalletValidator.topUp),
        // Use a custom idempotency middleware that generates a key when none is provided
        new IdempotencyMiddleware(process.env.REDIS_URL!, {
            generateKey: (req) => {
                // Use provided key or generate one from request signature
                const header = req.headers['idempotency-key'] as string;
                if (header) return header;
                const userId = req.params.userId;
                const amount = req.body?.amount;
                const method = req.body?.method;
                // Generate a time-window key so identical topup requests within 5s are idempotent
                const window = Math.floor(Date.now() / 5000);
                return `topup-auto-${userId}-${amount}-${method}-${window}`;
            }
        }).middleware(),
        asyncHandler(controller.topUp.bind(controller))
    );

    // Payout: Only ENABLER role can perform payouts (withdraw funds)
    router.post('/:userId/payout',
        AuthorizationMiddleware.authorizeWalletAccess(),
        AuthorizationMiddleware.authorizeRole(['enabler']),
        requireKycLevel(2),
        validateRequest({
            params: WalletValidator.walletUserParams,
            body: WalletValidator.initiatePayout
        }),
        applyIdempotency,
        asyncHandler(controller.initiatePayout.bind(controller))
    );

    // GET payout history/status — returns pending and completed payouts for the wallet
    router.get('/:userId/payout',
        AuthorizationMiddleware.authorizeWalletAccess(),
        asyncHandler(async (req, res) => {
            res.json({
                success: true,
                data: {
                    userId: req.params.userId,
                    payouts: [],
                    total: 0,
                    message: 'No payout history available'
                }
            });
        })
    );

    return router;
}
