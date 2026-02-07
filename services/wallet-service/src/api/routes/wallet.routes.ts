import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { WalletValidator } from '../validators/wallet.validator';
import { authenticate } from '../middleware/authentication.middleware';
import { AuthorizationMiddleware } from '../middleware/authorization.middleware';
import { correlationMiddleware } from '../middleware/correlation.middleware';

export function createWalletRoutes(controller: WalletController): Router {
    const router = Router();

    // All wallet routes require authentication
    router.use(authenticate);
    router.use(correlationMiddleware);

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

    router.post('/:userId/topup',
        AuthorizationMiddleware.authorizeWalletAccess(),
        validateRequest(WalletValidator.topUp),
        controller.topUp.bind(controller)
    );

    return router;
}
