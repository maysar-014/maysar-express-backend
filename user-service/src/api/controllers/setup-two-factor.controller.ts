import { Request, Response } from 'express';
import { SetupTwoFactorUseCase, SetupTwoFactorInput } from '../../application/use-cases';
import { SetupTwoFactorDTO } from '../../application/dto/setup-two-factor.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Setup Two Factor Controller
 * Layer Responsibility: Transport & validation only
 * Business logic delegated to Use Case
 */
export class SetupTwoFactorController {
  constructor(private setupTwoFactorUseCase: SetupTwoFactorUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requestBody = req.body as SetupTwoFactorDTO.Request;

      // Validation
      if (!id || !requestBody.method) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Delegate to use case
      const input: SetupTwoFactorInput = {
        userId: id,
        method: requestBody.method,
        deviceId: requestBody.deviceId
      };

      const result = await this.setupTwoFactorUseCase.execute(input);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Setup 2FA failed', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
