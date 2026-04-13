import { Request, Response } from 'express';
import { SubmitKycUseCase } from '../../application/use-cases/submit-kyc.use-case';
import { GetKycStatusUseCase } from '../../application/use-cases/get-kyc-status.use-case';

export class KycController {
  constructor(
    private readonly submitKycUseCase: SubmitKycUseCase,
    private readonly getKycStatusUseCase: GetKycStatusUseCase
  ) {}

  async submitKyc(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as { user?: { userId?: string } }).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = await this.submitKycUseCase.execute(userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to submit KYC'
      });
    }
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as { user?: { userId?: string } }).user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      const result = await this.getKycStatusUseCase.execute(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to load KYC status'
      });
    }
  }
}

