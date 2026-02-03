import { IUserRepository } from '../../domain/repositories';
import { logger } from '../../infrastructure/services/logger.service';

export interface SendPhoneOTPInput {
  userId: string;
  phoneNumber: string;
  method: 'sms' | 'call';
}

export interface SendPhoneOTPOutput {
  success: boolean;
  message: string;
  otpSent?: boolean;
  expiresIn?: number;
}

export interface VerifyPhoneOTPInput {
  userId: string;
  phoneNumber: string;
  otp: string;
}

export interface VerifyPhoneOTPOutput {
  success: boolean;
  message: string;
  verified?: boolean;
}

export class PhoneVerificationUseCase {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;

  constructor(private userRepository: IUserRepository) {}

  async sendOTP(input: SendPhoneOTPInput): Promise<SendPhoneOTPOutput> {
    try {
      logger.logBusiness('Sending phone OTP', input.userId, { phoneNumber: input.phoneNumber, method: input.method });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (!this.isValidPhoneNumber(input.phoneNumber)) {
        return { success: false, message: 'Invalid phone number format' };
      }

      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP (in production, use cache service)
      await this.storeOTP(input.userId, input.phoneNumber, otp, expiresAt);

      // Send OTP via SMS or call
      await this.sendOTPViaMethod(input.phoneNumber, input.method);

      logger.logBusiness('Phone OTP sent successfully', input.userId, { method: input.method });

      return {
        success: true,
        message: `OTP sent via ${input.method}`,
        otpSent: true,
        expiresIn: this.OTP_EXPIRY_MINUTES * 60
      };
    } catch (error) {
      logger.error('Failed to send phone OTP', { userId: input.userId, error });
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  async verifyOTP(input: VerifyPhoneOTPInput): Promise<VerifyPhoneOTPOutput> {
    try {
      logger.logBusiness('Verifying phone OTP', input.userId, { phoneNumber: input.phoneNumber });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      if (!input.otp || input.otp.length !== this.OTP_LENGTH) {
        return { success: false, message: 'Invalid OTP format' };
      }

      const storedOTP = await this.getStoredOTP(input.userId, input.phoneNumber);
      if (!storedOTP) {
        return { success: false, message: 'OTP expired or not found' };
      }

      if (storedOTP.otp !== input.otp) {
        await this.incrementAttempts(input.userId, input.phoneNumber);
        return { success: false, message: 'Invalid OTP' };
      }

      // Clear OTP after successful verification
      await this.clearOTP(input.userId, input.phoneNumber);

      // Update user phone verification status
      await this.userRepository.updatePhoneVerification(input.userId, true);

      logger.logBusiness('Phone OTP verified successfully', input.userId);

      return {
        success: true,
        message: 'Phone number verified successfully',
        verified: true
      };
    } catch (error) {
      logger.error('Failed to verify phone OTP', { userId: input.userId, error });
      return { success: false, message: 'Failed to verify OTP' };
    }
  }

  private generateOTP(): string {
    return Math.floor(Math.random() * Math.pow(10, this.OTP_LENGTH))
      .toString()
      .padStart(this.OTP_LENGTH, '0');
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    const tanzanianPhoneRegex = /^(\+255|0)(7[0-9]|6[0-9]|2[0-9])\d{7}$/;
    return tanzanianPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  }

  private async storeOTP(userId: string, phoneNumber: string, _otp: string, expiresAt: Date): Promise<void> {
    // TODO: Implement OTP storage in cache service
    logger.debug('Storing OTP', { userId, phoneNumber, expiresAt });
  }

  private async getStoredOTP(userId: string, phoneNumber: string): Promise<{ otp: string; expiresAt: Date } | null> {
    // TODO: Implement OTP retrieval from cache service
    logger.debug('Retrieving stored OTP', { userId, phoneNumber });
    return null;
  }

  private async clearOTP(userId: string, phoneNumber: string): Promise<void> {
    // TODO: Implement OTP deletion from cache service
    logger.debug('Clearing OTP', { userId, phoneNumber });
  }

  private async incrementAttempts(userId: string, phoneNumber: string): Promise<void> {
    // TODO: Implement attempt tracking
    logger.debug('Incrementing OTP attempts', { userId, phoneNumber });
  }

  private async sendOTPViaMethod(phoneNumber: string, method: 'sms' | 'call'): Promise<void> {
    // TODO: Implement SMS/call sending via external service
    logger.debug('Sending OTP via method', { phoneNumber, method });
  }
}
