import { Request, Response } from 'express';
import { SuspendAccountUseCase, SuspendAccountInput } from '../../application/use-cases';
import { SuspendAccountDTO } from '../../application/dto/suspend-account.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Suspend Account Controller
 * Layer Responsibility: Transport & validation only
 * Business logic delegated to Use Case
 */
export class SuspendAccountController {
  constructor(private suspendAccountUseCase: SuspendAccountUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requestBody = req.body as SuspendAccountDTO.Request;

      // Validation
      if (!id || !requestBody.suspendedBy || !requestBody.reason) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Delegate to use case
      const input: SuspendAccountInput = {
        userId: id,
        suspendedBy: requestBody.suspendedBy,
        reason: requestBody.reason,
        duration: requestBody.duration
      };

      const result = await this.suspendAccountUseCase.execute(input);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Suspend account failed', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
