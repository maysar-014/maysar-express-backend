import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';

export function createWalletRoutes(controller: WalletController): Router {
    const router = Router();

    router.get('/:userId', controller.getWallet.bind(controller));
    router.get('/:userId/balance', controller.getBalance.bind(controller));
    router.post('/:userId/credit', controller.creditWallet.bind(controller));
    router.post('/:userId/debit', controller.debitWallet.bind(controller));
    router.post('/:userId/freeze', controller.freezeFunds.bind(controller));
    router.post('/:userId/unfreeze', controller.unfreezeFunds.bind(controller));

    return router;
}
