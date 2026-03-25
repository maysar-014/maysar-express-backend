import { Router } from 'express';
import { validateRequest } from '../middleware/validation.middleware';
import { VerifyTwoFactorLoginUseCase } from '../../2fa/application/use-cases/verify-two-factor-login.use-case';

const buildHandler = (verifyTwoFactorLoginUseCase: VerifyTwoFactorLoginUseCase) => {
  return async (req: any, res: any) => {
    try {
      const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
      const otp = typeof req.body?.otp === 'string'
        ? req.body.otp.trim()
        : typeof req.body?.code === 'string'
          ? req.body.code.trim()
          : '';

      if (!userId || !otp) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId and otp are required'
          }
        });
        return;
      }

      const verified = await verifyTwoFactorLoginUseCase.execute(userId, otp);
      if (!verified) {
        res.status(401).json({
          success: false,
          verified: false,
          message: 'Invalid OTP code'
        });
        return;
      }

      res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'OTP_VERIFICATION_FAILED',
          message: error?.message || 'Failed to verify OTP'
        }
      });
    }
  };
};

export function createOtpVerificationRouter(verifyTwoFactorLoginUseCase: VerifyTwoFactorLoginUseCase): Router {
  const router = Router();
  const schema = {
    body: {
      userId: { type: 'string', required: true, minLength: 1 },
      otp: { type: 'string', required: false, pattern: /^\d{6}$/ },
      code: { type: 'string', required: false, pattern: /^\d{6}$/ }
    }
  };
  const handler = buildHandler(verifyTwoFactorLoginUseCase);

  router.post('/verify', validateRequest(schema), handler);
  router.post('/verify-otp', validateRequest(schema), handler);

  return router;
}
