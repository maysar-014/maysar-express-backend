import { IUserRepository } from '../../domain/repositories';
import { IDomainEventPublisher, UserPhoneVerifiedEvent } from '../../domain/events';
import { PhoneVerificationEvent } from '../sagas/phone-verification.saga';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';

export interface VerifyPhoneInput {
  userId: string;
  phoneNumber: string;
  otp: string;
  verificationMethod: 'otp' | 'sms' | 'call';
}

export interface VerifyPhoneOutput {
  success: boolean;
  message: string;
  phoneVerified?: boolean;
}

export class VerifyPhoneUseCase {
  constructor(
    private userRepository: IUserRepository,
    private eventPublisher: IDomainEventPublisher,
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

      // Publish domain event for downstream syncs
      const verificationMethod = input.verificationMethod === 'otp' ? 'sms' : input.verificationMethod;
      const sagaVerificationMethod = input.verificationMethod === 'sms' ? 'otp' : input.verificationMethod;
      const domainEvent = new UserPhoneVerifiedEvent(
        input.userId,
        input.phoneNumber,
        'unknown',
        verificationMethod
      );
      await this.eventPublisher.publish(domainEvent);

      // Publish phone verification event to trigger saga
      const event: PhoneVerificationEvent = {
        eventId: `phone-verification-${input.userId}-${Date.now()}`,
        aggregateId: input.userId,
        userId: input.userId,
        phoneNumber: input.phoneNumber,
        verificationMethod: sagaVerificationMethod,
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
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    const e164Like = /^\+?\d{7,15}$/;
    return e164Like.test(normalized);
  }

  private async validateOTP(userId: string, phoneNumber: string, otp: string): Promise<boolean> {
    // TODO: Implement actual OTP validation against stored OTP
    logger.debug('Validating OTP', { userId, phoneNumber, otpLength: otp.length });
    return true;
  }
}
