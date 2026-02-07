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

    async initiate(req: Request, res: Response): Promise<void> {
        try {
            const { userId, role: userRole } = (req as any).user;

            const result = await this.initiatePayoutUseCase.execute({
                ...req.body,
                userId,
                userRole
            });
            res.status(result.success ? 201 : 400).json(result);
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
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
