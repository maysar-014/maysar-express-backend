import { Request, Response } from 'express';
import { CreditWalletUseCase } from '../../application/use-cases/credit-wallet.use-case';
import { DebitWalletUseCase } from '../../application/use-cases/debit-wallet.use-case';
import { FreezeFundsUseCase } from '../../application/use-cases/freeze-funds.use-case';
import { UnfreezeFundsUseCase } from '../../application/use-cases/unfreeze-funds.use-case';

export class WalletController {
    constructor(
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly debitWalletUseCase: DebitWalletUseCase,
        private readonly freezeUseCase: FreezeFundsUseCase,
        private readonly unfreezeUseCase: UnfreezeFundsUseCase,
        private readonly walletRepository: any
    ) { }

    async getWallet(req: Request, res: Response): Promise<void> {
        try {
            const wallet = await this.walletRepository.findByUserId(req.params.userId);
            if (wallet) {
                res.status(200).json({
                    success: true,
                    data: wallet,
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Wallet not found',
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const wallet = await this.walletRepository.findByUserId(req.params.userId);
            if (wallet) {
                res.status(200).json({
                    balance: wallet.balance,
                    availableBalance: wallet.balance - wallet.frozenAmount,
                    frozenAmount: wallet.frozenAmount,
                    currency: wallet.currency
                });
            } else {
                res.status(404).json({ message: 'Wallet not found' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async creditWallet(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.creditWalletUseCase.execute({
                userId: req.params.userId,
                ...req.body
            });
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async debitWallet(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.debitWalletUseCase.execute({
                userId: req.params.userId,
                ...req.body
            });
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async freezeFunds(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.freezeUseCase.execute({
                userId: req.params.userId,
                ...req.body
            });
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async unfreezeFunds(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.unfreezeUseCase.execute({
                userId: req.params.userId,
                ...req.body
            });
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
