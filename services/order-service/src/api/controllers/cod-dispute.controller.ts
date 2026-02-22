import { Request, Response } from 'express';
import { ResolveCODDisputeUseCase } from '../../application/use-cases/resolve-cod-dispute.use-case';

export class CODDisputeController {
    constructor(
        private readonly resolveCODDisputeUseCase: ResolveCODDisputeUseCase
    ) { }

    /**
     * Resolve an active COD dispute.
     * Can be triggered by Admin or automated resolution logic.
     */
    async resolveDispute(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { resolution, decision } = req.body;

            if (!resolution || !decision) {
                res.status(400).json({
                    success: false,
                    error: 'Missing resolution text or decision'
                });
                return;
            }

            await this.resolveCODDisputeUseCase.execute({
                disputeId: id,
                resolution,
                decision
            });

            res.status(200).json({
                success: true,
                message: `Dispute ${id} resolved successfully with decision: ${decision}`
            });
        } catch (error: any) {
            console.error(`[Dispute] Resolution failed for ${req.params.id}:`, error.message);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}
