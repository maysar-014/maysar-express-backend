/**
 * Verify Phone OTP Use Case
 * Verifies a Firebase ID token, cross-checks the phone number claim, sets isPhoneVerified=true
 */

import { IUserRepository } from '../../domain/repositories';
import { IFirebaseAdminService } from '../../infrastructure/services/firebase-admin.service';
import {
  InvalidFirebaseTokenError,
  TokenMissingPhoneClaimError,
  PhoneNumberMismatchError
} from '../../domain/errors/phone-verification.errors';
import { maskPhone } from './initiate-phone-verification.use-case';

export interface VerifyPhoneOtpInput {
  userId: string;
  firebaseIdToken: string;
}

export interface VerifyPhoneOtpResult {
  success: boolean;
  phoneVerified: boolean;
}

export class VerifyPhoneOtpUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly firebaseAdminService: IFirebaseAdminService,
    private readonly logger: {
      info: (msg: string, meta?: any) => void;
      warn: (msg: string, meta?: any) => void;
      error: (msg: string, meta?: any) => void;
    }
  ) {}

  async execute(input: VerifyPhoneOtpInput): Promise<VerifyPhoneOtpResult> {
    const { userId, firebaseIdToken } = input;
    let phoneNumber: string | undefined;

    try {
      // Step 1: Verify Firebase ID token
      let decodedToken: any;
      try {
        decodedToken = await this.firebaseAdminService.verifyIdToken(firebaseIdToken);
      } catch (err: any) {
        const isFirebaseAuthError = err?.code?.startsWith?.('auth/') || err?.errorInfo?.code?.startsWith?.('auth/');
        if (isFirebaseAuthError) {
          throw new InvalidFirebaseTokenError(err.message || 'Token verification failed');
        }
        // Unexpected error — log and rethrow as 500
        this.logger.error('PhoneVerificationAudit', {
          action: 'PHONE_OTP_FAILED',
          userId,
          phoneNumber: '****????',
          timestamp: new Date().toISOString(),
          reason: 'Unexpected Firebase error: ' + (err?.message || 'unknown')
        });
        throw err;
      }

      // Step 2: Extract phone_number claim
      phoneNumber = decodedToken.phone_number;
      if (!phoneNumber) {
        throw new TokenMissingPhoneClaimError();
      }

      // Step 3: Find user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        const err = new Error('User not found');
        (err as any).name = 'UserNotFoundError';
        throw err;
      }

      // Step 4: Cross-check phone number
      if (user.phoneNumber !== phoneNumber) {
        throw new PhoneNumberMismatchError();
      }

      // Step 5: Set isPhoneVerified = true and persist
      user.isPhoneVerified = true;
      await this.userRepository.save(user);

      // Step 6: Audit log — success
      this.logger.info('PhoneVerificationAudit', {
        action: 'PHONE_OTP_VERIFIED',
        userId,
        phoneNumber: maskPhone(phoneNumber),
        timestamp: new Date().toISOString()
      });

      return { success: true, phoneVerified: true };

    } catch (err: any) {
      // Emit PHONE_OTP_FAILED for all domain errors (not already logged above)
      if (
        err.name !== 'UserNotFoundError' ||
        err instanceof InvalidFirebaseTokenError ||
        err instanceof TokenMissingPhoneClaimError ||
        err instanceof PhoneNumberMismatchError
      ) {
        if (err.name !== 'ALREADY_LOGGED') {
          this.logger.info('PhoneVerificationAudit', {
            action: 'PHONE_OTP_FAILED',
            userId,
            phoneNumber: phoneNumber ? maskPhone(phoneNumber) : '****????',
            timestamp: new Date().toISOString(),
            reason: err.name || err.message
          });
        }
      }
      throw err;
    }
  }
}
