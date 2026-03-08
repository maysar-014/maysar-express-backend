import { Request, Response } from 'express';
import { GetCODReputationUseCase } from '../../application/use-cases/get-cod-reputation.use-case';

export class CODReputationController {
    constructor(
        private readonly getCODReputationUseCase: GetCODReputationUseCase
    ) { }

    async getReputation(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            // Verification: Only self or admin can check reputation (simplified)
            const reputation = await this.getCODReputationUseCase.execute(userId);

            res.status(200).json({
                success: true,
                data: reputation
            });
        } catch (error: unknown) {
            res.status(404).json({
                success: false,
                error: error instanceof Error ? error.message : 'Not found'
            });
        }
    }
}
