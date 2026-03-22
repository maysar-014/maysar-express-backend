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
            const message = error instanceof Error ? error.message : 'Dispute resolution failed';
            const normalized = message.toLowerCase();
            const status = normalized.includes('not found')
                ? 404
                : normalized.includes('already closed')
                    ? 409
                    : 400;

            console.error(`[Dispute] Resolution failed for ${req.params.id}:`, message);
            res.status(status).json({
                success: false,
                error: message
            });
        }
    }
}
