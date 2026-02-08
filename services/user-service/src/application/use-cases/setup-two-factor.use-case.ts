import { IUserRepository } from '../../domain/repositories';
import { TwoFactorSetupEvent } from '../sagas/two-factor-setup.saga';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';

export interface SetupTwoFactorInput {
  userId: string;
  method: 'totp' | 'sms';
  deviceId?: string | undefined;
}

export interface SetupTwoFactorOutput {
  success: boolean;
  message: string;
  secret?: string | undefined;
  backupCodes?: string[] | undefined;
}

export class SetupTwoFactorUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

  async execute(input: SetupTwoFactorInput): Promise<SetupTwoFactorOutput> {
    try {
      logger.logBusiness('Starting 2FA setup', input.userId, { method: input.method });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Generate secret for TOTP
      let secret: string | undefined;
      if (input.method === 'totp') {
        secret = this.generateTOTPSecret();
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes(10);

      // Store 2FA configuration (if method exists)
      if ('setupTwoFactor' in this.userRepository) {
        await (this.userRepository as any).setupTwoFactor(input.userId, {
          method: input.method,
          secret,
          backupCodes,
          deviceId: input.deviceId,
          enabled: false
        });
      }

      // Publish 2FA setup event to trigger saga
      const event: TwoFactorSetupEvent = {
        eventId: `2fa-setup-${input.userId}-${Date.now()}`,
        aggregateId: input.userId,
        userId: input.userId,
        method: input.method,
        ...(input.deviceId && { deviceId: input.deviceId }),
        timestamp: new Date()
      };

      await sagaEventHandler.handleTwoFactorSetupEvent(event, this.emailService, this.notificationClient);

      logger.logBusiness('2FA setup initiated', input.userId, { method: input.method });

      return {
        success: true,
        message: '2FA setup initiated. Please verify with the code from your authenticator app.',
        secret,
        backupCodes
      };

    } catch (error) {
      logger.error('Failed to setup 2FA', { userId: input.userId, error });
      return { success: false, message: 'Failed to setup two-factor authentication' };
    }
  }

  private generateTOTPSecret(): string {
    // Generate a random base32 encoded secret (typically 32 characters)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
