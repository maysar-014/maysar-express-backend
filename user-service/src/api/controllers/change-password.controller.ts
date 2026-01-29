import { Request, Response } from 'express';
import { ChangePasswordUseCase, ChangePasswordInput } from '../../application/use-cases';
import { ChangePasswordDTO } from '../../application/dto/change-password.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Change Password Controller
 * Layer Responsibility: Transport & validation only
 * Business logic delegated to Use Case
 */
export class ChangePasswordController {
  constructor(private changePasswordUseCase: ChangePasswordUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requestBody = req.body as ChangePasswordDTO.Request;

      // Validation
      if (!id || !requestBody.newPassword || !requestBody.changedBy) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Delegate to use case
      const input: ChangePasswordInput = {
        userId: id,
        newPassword: requestBody.newPassword,
        changedBy: requestBody.changedBy,
        currentPassword: requestBody.currentPassword
      };

      const result = await this.changePasswordUseCase.execute(input);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Change password failed', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
