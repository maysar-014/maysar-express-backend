// @ts-nocheck
/**
 * Phone Verification Controller
 * Handles HTTP requests for Firebase Phone OTP verification
 */

import { Request, Response } from 'express';
import { InitiatePhoneVerificationUseCase } from '../../application/use-cases/initiate-phone-verification.use-case';
import { VerifyPhoneOtpUseCase } from '../../application/use-cases/verify-phone-otp.use-case';
import {
  InvalidPhoneNumberError,
  InvalidFirebaseTokenError,
  TokenMissingPhoneClaimError,
  PhoneNumberMismatchError,
  MissingFirebaseTokenError
} from '../../domain/errors/phone-verification.errors';

export class PhoneVerificationController {
  constructor(
    private readonly initiatePhoneVerificationUseCase: InitiatePhoneVerificationUseCase,
    private readonly verifyPhoneOtpUseCase: VerifyPhoneOtpUseCase
  ) {}

  /**
   * POST /v1/phone/send-otp
   * Registers phone number and resets verification status
   */
  async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const phoneNumber = req.body?.phoneNumber;
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        res.status(400).json({ success: false, error: { code: 'INVALID_PHONE_NUMBER', message: 'phoneNumber is required.' } });
        return;
      }

      const result = await this.initiatePhoneVerificationUseCase.execute({ userId, phoneNumber });
      res.status(200).json(result);

    } catch (err: any) {
      if (err instanceof InvalidPhoneNumberError) {
        res.status(400).json({ success: false, error: { code: 'INVALID_PHONE_NUMBER', message: err.message } });
      } else if (err?.name === 'UserNotFoundError') {
        res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
      } else {
        console.error('PhoneVerificationController.sendOtp error:', err?.message);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' } });
      }
    }
  }

  /**
   * POST /v1/phone/verify-otp
   * Verifies Firebase ID token and marks phone as verified
   */
  async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const firebaseIdToken = req.body?.firebaseIdToken;
      if (!firebaseIdToken || typeof firebaseIdToken !== 'string') {
        res.status(400).json({ success: false, error: { code: 'MISSING_FIREBASE_TOKEN', message: 'firebaseIdToken is required.' } });
        return;
      }

      const result = await this.verifyPhoneOtpUseCase.execute({ userId, firebaseIdToken });
      res.status(200).json(result);

    } catch (err: any) {
      if (err instanceof InvalidFirebaseTokenError) {
        res.status(401).json({ success: false, error: { code: 'INVALID_FIREBASE_TOKEN', message: err.message } });
      } else if (err instanceof TokenMissingPhoneClaimError) {
        res.status(422).json({ success: false, error: { code: 'TOKEN_MISSING_PHONE_CLAIM', message: err.message } });
      } else if (err instanceof PhoneNumberMismatchError) {
        res.status(409).json({ success: false, error: { code: 'PHONE_NUMBER_MISMATCH', message: err.message } });
      } else if (err instanceof MissingFirebaseTokenError) {
        res.status(400).json({ success: false, error: { code: 'MISSING_FIREBASE_TOKEN', message: err.message } });
      } else if (err?.name === 'UserNotFoundError') {
        res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } });
      } else {
        console.error('PhoneVerificationController.verifyOtp error:', err?.message);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An internal error occurred.' } });
      }
    }
  }
}
