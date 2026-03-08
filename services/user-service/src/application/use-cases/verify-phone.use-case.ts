import { IUserRepository } from '../../domain/repositories';
import { PhoneVerificationEvent } from '../sagas/phone-verification.saga';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';

export interface VerifyPhoneInput {
  userId: string;
  phoneNumber: string;
  otp: string;
  verificationMethod: 'otp' | 'call';
}

export interface VerifyPhoneOutput {
  success: boolean;
  message: string;
  phoneVerified?: boolean;
}

export class VerifyPhoneUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

  async execute(input: VerifyPhoneInput): Promise<VerifyPhoneOutput> {
    try {
      logger.info('Starting phone verification', { userId: input.userId, phoneNumber: input.phoneNumber });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Validate OTP format
      if (!input.otp || input.otp.length < 4) {
        return { success: false, message: 'Invalid OTP format' };
      }

      // Validate phone number format
      if (!this.isValidPhoneNumber(input.phoneNumber)) {
        return { success: false, message: 'Invalid phone number format' };
      }

      // Verify OTP (in production, check against stored OTP)
      const otpValid = await this.validateOTP(input.userId, input.phoneNumber, input.otp);
      if (!otpValid) {
        return { success: false, message: 'Invalid or expired OTP' };
      }

      // Update phone verification status
      await this.userRepository.updatePhoneVerification(input.userId, true);

      // Publish phone verification event to trigger saga
      const event: PhoneVerificationEvent = {
        eventId: `phone-verification-${input.userId}-${Date.now()}`,
        aggregateId: input.userId,
        userId: input.userId,
        phoneNumber: input.phoneNumber,
        verificationMethod: input.verificationMethod,
        timestamp: new Date()
      };

      await sagaEventHandler.handlePhoneVerificationEvent(event, this.emailService, this.notificationClient);

      logger.info('Phone verified successfully', { userId: input.userId, phoneNumber: input.phoneNumber });

      return {
        success: true,
        message: 'Phone number verified successfully',
        phoneVerified: true
      };

    } catch (error) {
      logger.error('Failed to verify phone', { userId: input.userId, error });
      return { success: false, message: 'Failed to verify phone number' };
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    const tanzanianPhoneRegex = /^(\+255|0)(7[0-9]|6[0-9]|2[0-9])\d{7}$/;
    return tanzanianPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  }

  private async validateOTP(userId: string, phoneNumber: string, otp: string): Promise<boolean> {
    // TODO: Implement actual OTP validation against stored OTP
    logger.debug('Validating OTP', { userId, phoneNumber, otpLength: otp.length });
    return true;
  }
}
