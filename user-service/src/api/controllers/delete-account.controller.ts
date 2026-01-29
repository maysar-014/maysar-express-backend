import { Request, Response } from 'express';
import { DeleteAccountUseCase, DeleteAccountInput } from '../../application/use-cases';
import { DeleteAccountDTO } from '../../application/dto/delete-account.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Delete Account Controller
 * Layer Responsibility: Transport & validation only
 * Business logic delegated to Use Case
 */
export class DeleteAccountController {
  constructor(private deleteAccountUseCase: DeleteAccountUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requestBody = req.body as DeleteAccountDTO.Request;

      // Validation
      if (!id || !requestBody.deletedBy || !requestBody.reason) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Delegate to use case
      const input: DeleteAccountInput = {
        userId: id,
        deletedBy: requestBody.deletedBy,
        reason: requestBody.reason,
        verificationToken: requestBody.verificationToken
      };

      const result = await this.deleteAccountUseCase.execute(input);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Delete account failed', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
