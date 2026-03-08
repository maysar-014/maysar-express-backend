import { Request, Response } from 'express';
import { CreditWalletUseCase } from '../../application/use-cases/credit-wallet.use-case';
import { DebitWalletUseCase } from '../../application/use-cases/debit-wallet.use-case';
import { FreezeFundsUseCase } from '../../application/use-cases/freeze-funds.use-case';
import { UnfreezeFundsUseCase } from '../../application/use-cases/unfreeze-funds.use-case';
import { PlaceHoldUseCase } from '../../application/use-cases/place-hold.use-case';
import { ReleaseHoldUseCase } from '../../application/use-cases/release-hold.use-case';
import { CaptureHoldUseCase } from '../../application/use-cases/capture-hold.use-case';
import { ReverseTransactionUseCase } from '../../application/use-cases/reverse-transaction.use-case';
import { GetWalletStatementUseCase } from '../../application/use-cases/get-wallet-statement.use-case';
import { TopUpWalletUseCase } from '../../application/use-cases/top-up-wallet.use-case';
import { InitiatePayoutFromWalletUseCase } from '../../application/use-cases/initiate-payout-from-wallet.use-case';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
import { AuditInfo } from '../../domain/value-objects/audit-info.value-object';

export class WalletController {
    constructor(
        private readonly creditWalletUseCase: CreditWalletUseCase,
        private readonly debitWalletUseCase: DebitWalletUseCase,
        private readonly freezeUseCase: FreezeFundsUseCase,
        private readonly unfreezeUseCase: UnfreezeFundsUseCase,
        private readonly placeHoldUseCase: PlaceHoldUseCase,
        private readonly releaseHoldUseCase: ReleaseHoldUseCase,
        private readonly captureHoldUseCase: CaptureHoldUseCase,
        private readonly reverseTransactionUseCase: ReverseTransactionUseCase,
        private readonly getStatementUseCase: GetWalletStatementUseCase,
        private readonly topUpUseCase: TopUpWalletUseCase,
        private readonly walletRepository: IWalletRepository,
        private readonly initiatePayoutUseCase: InitiatePayoutFromWalletUseCase
    ) { }

    private getAuditInfo(req: Request): AuditInfo {
        return new AuditInfo({
            actor: req.body.auditActor || 'system',
            actorType: req.body.auditActorType || 'SYSTEM',
            action: req.path,
            reason: req.body.reason || 'API_REQUEST',
            timestamp: new Date(),
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            metadata: {
                path: req.path,
                method: req.method
            }
        });
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'Internal server error';
    }

    async getWallet(req: Request, res: Response): Promise<void> {
        try {
            const wallet = await this.walletRepository.findByUserId(req.params.userId);
            if (wallet) {
                res.status(200).json({
                    success: true,
                    data: wallet.toObject(),
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
                    availableBalance: wallet.getAvailableBalance(),
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
                ...req.body,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(200).json(result);
        } catch (error: unknown) {
            res.status(400).json({ success: false, error: this.getErrorMessage(error) });
        }
    }

    async debitWallet(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.debitWalletUseCase.execute({
                userId: req.params.userId,
                ...req.body,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(200).json(result);
        } catch (error: unknown) {
            res.status(400).json({ success: false, error: this.getErrorMessage(error) });
        }
    }

    async placeHold(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.placeHoldUseCase.execute({
                userId: req.params.userId,
                ...req.body,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(200).json(result);
        } catch (error: unknown) {
            res.status(400).json({ success: false, error: this.getErrorMessage(error) });
        }
    }

    async releaseHold(req: Request, res: Response): Promise<void> {
        try {
            await this.releaseHoldUseCase.execute({
                userId: req.params.userId,
                holdId: req.params.holdId,
                ...req.body,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(200).json({ success: true, message: 'Hold released' });
        } catch (error: unknown) {
            res.status(400).json({ success: false, error: this.getErrorMessage(error) });
        }
    }

    async captureHold(req: Request, res: Response): Promise<void> {
        try {
            await this.captureHoldUseCase.execute({
                userId: req.params.userId,
                holdId: req.params.holdId,
                ...req.body,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(200).json({ success: true, message: 'Hold captured' });
        } catch (error: unknown) {
            res.status(400).json({ success: false, error: this.getErrorMessage(error) });
        }
    }

    async reverseTransaction(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.reverseTransactionUseCase.execute({
                userId: req.params.userId,
                transactionId: req.params.transactionId,
                ...req.body,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(200).json(result);
        } catch (error: unknown) {
            res.status(400).json({ success: false, error: this.getErrorMessage(error) });
        }
    }

    async getStatement(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.getStatementUseCase.execute({
                userId: req.params.userId,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                page: req.query.page ? parseInt(req.query.page as string) : 1
            });
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async topUp(req: Request, res: Response): Promise<void> {
        try {
            const user = req.user;
            const userRoles = user?.roles || [];

            // Find the first eligible role (buyer or seller) from the user's roles array
            const eligibleTopUpRoles = ['buyer', 'seller'];
            const resolvedRole = userRoles.find((role: string) =>
                eligibleTopUpRoles.includes(role.toLowerCase())
            );

            if (!resolvedRole) {
                res.status(403).json({
                    success: false,
                    error: userRoles.length > 0
                        ? `None of the user roles [${userRoles.join(', ')}] are eligible for top-up. Only BUYER and SELLER roles can top up.`
                        : 'User role not found'
                });
                return;
            }

            const result = await this.topUpUseCase.execute({
                userId: req.params.userId,
                userRole: resolvedRole,
                ...req.body,
                correlationId: req.body.correlationId,
                auditInfo: this.getAuditInfo(req)
            });

            if (!result.success) {
                // Role ineligibility is an authorization failure (403), not a bad request (400)
                const isRoleError = result.message?.includes('not eligible') || result.message?.includes('Only BUYER and SELLER');
                const statusCode = isRoleError ? 403 : 400;
                res.status(statusCode).json(result);
                return;
            }

            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async freezeFunds(req: Request, res: Response): Promise<void> {
        try {
            const result = await this.freezeUseCase.execute({
                userId: req.params.userId,
                ...req.body,
                correlationId: req.body.correlationId || req.body.idempotencyKey || `freeze_${Date.now()}`,
                auditInfo: this.getAuditInfo(req)
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
                ...req.body,
                correlationId: req.body.correlationId || req.body.idempotencyKey || `unfreeze_${Date.now()}`,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async initiatePayout(req: Request, res: Response): Promise<void> {
        try {
            const user = req.user;
            const userRoles = user?.roles || [];

            // Find if user has enabler role (case-insensitive)
            const hasEnablerRole = userRoles.some((role: string) =>
                role.toLowerCase() === 'enabler'
            );

            if (!hasEnablerRole) {
                res.status(403).json({
                    success: false,
                    error: userRoles.length > 0
                        ? `None of the user roles [${userRoles.join(', ')}] are eligible for payouts. Only ENABLER role can perform payouts.`
                        : 'User role not found'
                });
                return;
            }

            const result = await this.initiatePayoutUseCase.execute({
                userId: req.params.userId,
                userRole: 'enabler', // Pass normalized role to use case
                ...req.body,
                auditInfo: this.getAuditInfo(req)
            });
            res.status(result.success ? 201 : 400).json(result);
        } catch (error: unknown) {
            res.status(500).json({ success: false, error: this.getErrorMessage(error) });
        }
    }
}
