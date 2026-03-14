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

const idempotencyMiddleware = new IdempotencyMiddleware(process.env.REDIS_URL!);
const redisClient = getSharedRedisClient(resolveRedisUrl(process.env.REDIS_URL));

export function createWalletRoutes(controller: WalletController): Router {
    const router = Router();

    // All wallet routes require authentication
    router.use(authenticate);
    router.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 60,
        store: new RedisRateLimitStore(redisClient, 'rl:wallet:'),
        passOnStoreError: true
    }));
    router.use(correlationMiddleware);
    router.use(idempotencyMiddleware.middleware());

    // General wallet access (read)
    router.get('/:userId',
        AuthorizationMiddleware.authorizeWalletAccess(),
        controller.getWallet.bind(controller)
    );

    router.get('/:userId/balance',
        AuthorizationMiddleware.authorizeWalletAccess(),
        controller.getBalance.bind(controller)
    );

    // Write operations
    router.post('/:userId/credit',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.creditWallet),
        controller.creditWallet.bind(controller)
    );

    router.post('/:userId/debit',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.debitWallet),
        controller.debitWallet.bind(controller)
    );

    router.post('/:userId/hold',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.placeHold),
        controller.placeHold.bind(controller)
    );

    router.post('/:userId/hold/:holdId/release',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.releaseHold),
        controller.releaseHold.bind(controller)
    );

    router.post('/:userId/hold/:holdId/capture',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.captureHold),
        controller.captureHold.bind(controller)
    );

    router.post('/:userId/transaction/:transactionId/reverse',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.reverseTransaction),
        controller.reverseTransaction.bind(controller)
    );

    router.get('/:userId/statement',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.getStatement),
        controller.getStatement.bind(controller)
    );

    // Admin/Internal only? For now authorize regular access
    router.post('/:userId/freeze',
        AuthorizationMiddleware.authorizeWalletAccess(),
        controller.freezeFunds.bind(controller)
    );

    router.post('/:userId/unfreeze',
        AuthorizationMiddleware.authorizeWalletAccess(),
        controller.unfreezeFunds.bind(controller)
    );

    // Top-up: Only BUYER and SELLER roles can top up their wallets
    router.post('/:userId/topup',
        AuthorizationMiddleware.authorizeWalletAccess(),
        AuthorizationMiddleware.authorizeRole(['buyer', 'seller']),
        validateRequest(WalletValidator.topUp),
        controller.topUp.bind(controller)
    );

    // Payout: Only ENABLER role can perform payouts (withdraw funds)
    router.post('/:userId/payout',
        AuthorizationMiddleware.authorizeWalletAccess(),
        AuthorizationMiddleware.authorizeRole(['enabler']),
        validateRequest(WalletValidator.initiatePayout),
        controller.initiatePayout.bind(controller)
    );

    return router;
}
