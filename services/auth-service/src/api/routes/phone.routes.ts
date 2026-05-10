/**
 * Phone Verification Routes
 * POST /v1/phone/send-otp  — register phone number, reset verification status
 * POST /v1/phone/verify-otp — verify Firebase ID token, set isPhoneVerified=true
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { rateLimit } from '../middleware/rate-limiting.middleware';
import { requireAuth } from '@shared/middleware/auth-context.middleware';
import { PhoneVerificationController } from '../controllers/phone-verification.controller';

export const createPhoneRoutes = (controller: PhoneVerificationController): Router => {
  const router = Router();

  /**
   * POST /v1/phone/send-otp
   * Authenticated — registers phone number and resets isPhoneVerified to false
   * Rate limited: 5 requests per 15 minutes per user
   */
  router.post(
    '/send-otp',
    requireAuth,
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5, prefix: 'rl:phone-send-otp:' }),
    asyncHandler(controller.sendOtp.bind(controller))
  );

  /**
   * POST /v1/phone/verify-otp
   * Authenticated — verifies Firebase ID token and sets isPhoneVerified=true
   * Rate limited: 10 requests per 15 minutes per user
   */
  router.post(
    '/verify-otp',
    requireAuth,
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10, prefix: 'rl:phone-verify-otp:' }),
    asyncHandler(controller.verifyOtp.bind(controller))
  );

  return router;
};
