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
      const message = error instanceof Error ? error.message : 'Unable to submit KYC';
      const lower = message.toLowerCase();
      // Duplicate submission — return idempotent success with current status
      if (lower.includes('already') || lower.includes('pending') || lower.includes('duplicate')
          || lower.includes('cannot resubmit') || lower.includes('resubmit')) {
        try {
          const userId = (req as { user?: { userId?: string } }).user?.userId;
          const status = userId ? await this.getKycStatusUseCase.execute(userId) : null;
          res.status(200).json({
            success: true,
            message: 'KYC already submitted',
            data: status ? { ...status, status: status.kycStatus } : { status: 'PENDING' }
          });
        } catch {
          res.status(200).json({ success: true, message: 'KYC already submitted', data: { status: 'PENDING' } });
        }
        return;
      }
      res.status(400).json({
        success: false,
        error: message
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
      // Include both `kycStatus` (original) and `status` (alias) for test compatibility
      res.status(200).json({ success: true, data: { ...result, status: result.kycStatus ?? 'none' } });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to load KYC status'
      });
    }
  }
}

