import { Request, Response } from 'express';
import { AdminVerifyKycUseCase } from '../../application/use-cases/admin-verify-kyc.use-case';

export class KycAdminController {
  constructor(private readonly adminVerifyKycUseCase: AdminVerifyKycUseCase) {}

  async verifyKyc(req: Request, res: Response): Promise<void> {
    try {
      const adminUserId = (req as { user?: { userId?: string } }).user?.userId
        || (req as { service?: { serviceId?: string } }).service?.serviceId
        || 'system';
      const result = await this.adminVerifyKycUseCase.execute({
        userId: req.params.userId,
        action: req.body.action,
        adminUserId,
        kycLevel: req.body.kycLevel,
        reason: req.body.reason
      });

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to verify KYC'
      });
    }
  }
}

