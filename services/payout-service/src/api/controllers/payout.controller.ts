import { Request, Response } from 'express';
import { InitiatePayoutUseCase } from '../../application/use-cases/initiate-payout.use-case';
import { CompletePayoutUseCase } from '../../application/use-cases/complete-payout.use-case';
import { CancelPayoutUseCase } from '../../application/use-cases/cancel-payout.use-case';

export class PayoutController {
    constructor(
        private readonly initiatePayoutUseCase: InitiatePayoutUseCase,
        private readonly completePayoutUseCase: CompletePayoutUseCase,
        private readonly cancelPayoutUseCase: CancelPayoutUseCase,
        private readonly payoutRepository: any
    ) { }

    private resolveUserRole(user: any): string | undefined {
        if (!user) return undefined;
        if (typeof user.role === 'string' && user.role.trim().length) return user.role;
        if (Array.isArray(user.roles) && user.roles.length) return String(user.roles[0]);
        return undefined;
    }

    async initiate(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;
            const userRole = this.resolveUserRole(user);

            const result = await this.initiatePayoutUseCase.execute({
                ...req.body,
                userId: user?.userId,
                userRole,
                availableBalance: req.body.availableBalance,
                userStatus: req.body.userStatus,
                lastPayoutDate: req.body.lastPayoutDate ? new Date(req.body.lastPayoutDate) : undefined
            });
            res.status(result.success ? 201 : 400).json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Internal server error';
            const lower = message.toLowerCase();
            if (
                lower.includes('invalid') ||
                lower.includes('required') ||
                lower.includes('must be') ||
                lower.includes('eligible')
            ) {
                res.status(400).json({ success: false, error: message });
                return;
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async list(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;
            if (!user || !user.userId) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    }
                });
                return;
            }

            const limitParam = Number(req.query.limit);
            const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 20;
            const role = this.resolveUserRole(user);

            const payouts = role
                ? await this.payoutRepository.findByUserIdAndRole(user.userId, role, limit)
                : await this.payoutRepository.findByUserId(user.userId, limit);

            res.status(200).json({ success: true, data: payouts });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async getPayout(req: Request, res: Response): Promise<void> {
        try {
            const payout = await this.payoutRepository.findById(req.params.id);
            if (payout) {
                res.status(200).json({ success: true, data: payout });
            } else {
                res.status(404).json({ success: false, error: 'Payout not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    async cancel(req: Request, res: Response): Promise<void> {
        try {
            await this.cancelPayoutUseCase.execute(req.params.id, req.body.reason);
            res.status(200).json({ success: true, message: 'Payout cancelled' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Internal server error';
            if (message.toLowerCase().includes('not found')) {
                res.status(404).json({ success: false, error: 'Payout not found' });
                return;
            }
            if (
                message.toLowerCase().includes('cannot cancel')
                || message.toLowerCase().includes('invalid')
                || message.toLowerCase().includes('already')
            ) {
                res.status(409).json({ success: false, error: message });
                return;
            }
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
