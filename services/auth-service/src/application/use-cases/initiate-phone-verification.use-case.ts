/**
 * Initiate Phone Verification Use Case
 * Validates E.164 phone number, stores it on the user record, resets isPhoneVerified to false
 */

import { IUserRepository } from '../../domain/repositories';
import { InvalidPhoneNumberError } from '../../domain/errors/phone-verification.errors';

// E.164 format: + followed by country code (non-zero) and 6-14 more digits
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `****${digits.slice(-4)}`;
}

export interface InitiatePhoneVerificationInput {
  userId: string;
  phoneNumber: string;
}

export interface InitiatePhoneVerificationResult {
  success: boolean;
  message: string;
}

export class InitiatePhoneVerificationUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: { info: (msg: string, meta?: any) => void; warn: (msg: string, meta?: any) => void }
  ) {}

  async execute(input: InitiatePhoneVerificationInput): Promise<InitiatePhoneVerificationResult> {
    const { userId, phoneNumber } = input;

    // Step 1: Validate E.164 format
    if (!E164_REGEX.test(phoneNumber)) {
      throw new InvalidPhoneNumberError(phoneNumber);
    }

    // Step 2: Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      (err as any).name = 'UserNotFoundError';
      throw err;
    }

    // Step 3: Update phone number and reset verification flag
    user.phoneNumber = phoneNumber;
    user.isPhoneVerified = false;

    // Step 4: Persist
    await this.userRepository.save(user);

    // Step 5: Audit log
    this.logger.info('PhoneVerificationAudit', {
      action: 'PHONE_OTP_INITIATED',
      userId,
      phoneNumber: maskPhone(phoneNumber),
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Phone number registered. Complete OTP verification via the Firebase client SDK.'
    };
  }
}
