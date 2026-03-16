import { IUserRepository } from '../../domain/repositories';
import { PrismaPasswordResetTokenRepository } from '../../infrastructure/repositories/prisma-password-reset-token.repository';
import { EmailService } from '../../infrastructure/services/email.service';
import { v4 as uuidv4 } from 'uuid';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface RequestPasswordResetInput {
  email: string;
}

export interface RequestPasswordResetOutput {
  success: boolean;
  message: string;
}

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetTokens: PrismaPasswordResetTokenRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<RequestPasswordResetOutput> {
    const normalizedEmail = input.email.toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Avoid user enumeration
      return {
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.'
      };
    }

    const token = uuidv4();
    await this.passwordResetTokens.create({
      id: makeId(getModelPrefix('Auth_PasswordResetToken')),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    await this.emailService.sendPasswordResetEmail(user.email.getValue(), token);

    return {
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    };
  }
}
