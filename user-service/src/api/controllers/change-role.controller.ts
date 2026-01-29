import { Request, Response } from 'express';
import { ChangeRoleUseCase, ChangeRoleInput } from '../../application/use-cases';
import { ChangeRoleDTO } from '../../application/dto/change-role.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Change Role Controller
 * Layer Responsibility: Transport & validation only
 * Business logic delegated to Use Case
 */
export class ChangeRoleController {
  constructor(private changeRoleUseCase: ChangeRoleUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requestBody = req.body as ChangeRoleDTO.Request;

      // Validation
      if (!id || !requestBody.newRole || !requestBody.changedBy) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Delegate to use case
      const input: ChangeRoleInput = {
        userId: id,
        newRole: requestBody.newRole,
        changedBy: requestBody.changedBy,
        promotionReason: requestBody.promotionReason
      };

      const result = await this.changeRoleUseCase.execute(input);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Change role failed', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
