import crypto from 'crypto';
import { IPasswordResetUserReader, IPasswordResetRepository } from '../../domain/repositories';
import { logger } from '../../infrastructure/services/logger.service';
import { IAuthEmailService } from '../../infrastructure/services/email.service';

export interface ForgotPasswordInput {
  email: string;
  baseUrl?: string;
}

export interface ForgotPasswordOutput {
  success: boolean;
  message: string;
  devResetUrl?: string;
}

export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepository: IPasswordResetUserReader,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly emailService?: IAuthEmailService
  ) {}

  async execute(input: ForgotPasswordInput): Promise<ForgotPasswordOutput> {
    const normalizedEmail = (input.email || '').trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return {
        success: false,
        message: 'A valid email address is required'
      };
    }

    try {
      const user = await this.userRepository.findByEmail(normalizedEmail);
      let devResetUrl: string | undefined;

      if (user) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        await this.passwordResetRepository.create({
          id: tokenId,
          userId: user.id,
          token: rawToken,
          expiresAt
        });

        const baseUrl = process.env.FRONTEND_URL || input.baseUrl || 'http://localhost:3000';
        devResetUrl = `${baseUrl.replace(/\/$/, '')}/en/reset-password?token=${rawToken}`;

        if (this.emailService) {
          await this.emailService.sendPasswordResetEmail(normalizedEmail, rawToken, devResetUrl);
        }

        logger.info('[AuthService] Password reset token generated', {
          userId: user.id,
          email: normalizedEmail,
          expiresAt: expiresAt.toISOString(),
          resetUrl: devResetUrl
        });
      } else {
        // Distinguish a PII lookup failure from a genuinely non-existent email.
        // If the email exists in the system but findByEmail returned null, this is an
        // infrastructure error — log it for observability but still return the
        // security-by-design generic response so as not to disclose account existence.
        const exists = await this.userRepository.emailExists(normalizedEmail);
        if (exists) {
          logger.error('[AuthService] findByEmail returned null for a verified-existent email — possible PII index miss or schema mismatch', {
            email: normalizedEmail
          });
        } else {
          logger.info('[AuthService] Forgot password requested for non-existent email', {
            email: normalizedEmail
          });
        }
      }

      return {
        success: true,
        message: 'If an account exists for this email, reset instructions have been sent.',
        ...(process.env.NODE_ENV !== 'production' && devResetUrl ? { devResetUrl } : {})
      };
    } catch (error: any) {
      logger.error('[AuthService] Error executing forgot password use case', {
        email: normalizedEmail,
        error: error?.message || error
      });
      return {
        success: false,
        message: 'An unexpected error occurred while processing your request'
      };
    }
  }
}
