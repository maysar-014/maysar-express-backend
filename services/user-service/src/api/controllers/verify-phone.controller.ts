import { Request, Response } from 'express';
import { VerifyPhoneUseCase, VerifyPhoneInput } from '../../application/use-cases';
import { VerifyPhoneDTO } from '../../application/dto/verify-phone.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Verify Phone Controller
 * Layer Responsibility: Transport & validation only
 * Business logic delegated to Use Case
 */
export class VerifyPhoneController {
  constructor(private verifyPhoneUseCase: VerifyPhoneUseCase) {}

  async handle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const requestBody = req.body as VerifyPhoneDTO.Request;

      // Validation
      if (!id || !requestBody.phoneNumber || !requestBody.otp) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
      }

      // Delegate to use case
      const input: VerifyPhoneInput = {
        userId: id,
        phoneNumber: requestBody.phoneNumber,
        otp: requestBody.otp,
        verificationMethod: requestBody.verificationMethod
      };

      const result = await this.verifyPhoneUseCase.execute(input);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error('Verify phone failed', { error });
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
