import { prisma } from '../infrastructure/database/prisma-client';
import { PrismaUserRepository } from '../infrastructure/repositories/prisma-user.repository';
import { UserValidationService } from '../domain/services/user-validation.service';
import { UserSecurityPolicy } from '../domain/policies/user-security.policy';
import { UserEventPublisher } from '../infrastructure/messaging/user-event-publisher';
import { UserOutboxRepository } from '../infrastructure/messaging/user-outbox.repository';
import { PrismaEmailVerificationTokenRepository } from '../infrastructure/repositories/prisma-email-verification-token.repository';
import { PrismaPasswordResetTokenRepository } from '../infrastructure/repositories/prisma-password-reset-token.repository';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case';
import { VerifyEmailUseCase } from '../application/use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case';
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case';
import { UserMapper } from '../application/mappers/user-mapper';
import { emailService, notificationClient } from '../infrastructure/services/service-instances';
import { PiiEncryptionService } from '../../../../shared/encryption/pii-encryption.service';

const context = (() => {
  const userRepository = new PrismaUserRepository(prisma, new PiiEncryptionService());
  const emailVerificationTokens = new PrismaEmailVerificationTokenRepository(prisma);
  const passwordResetTokens = new PrismaPasswordResetTokenRepository(prisma);
  const outboxRepository = new UserOutboxRepository(prisma);
  const eventPublisher = new UserEventPublisher(outboxRepository);
  const userValidationService = new UserValidationService();
  const userSecurityPolicy = new UserSecurityPolicy();

  const createUserUseCase = new CreateUserUseCase(
    userRepository,
    userValidationService,
    userSecurityPolicy,
    eventPublisher,
    emailVerificationTokens,
    emailService,
    notificationClient
  );

  const updateUserUseCase = new UpdateUserUseCase(userRepository, eventPublisher);
  const verifyEmailUseCase = new VerifyEmailUseCase(userRepository, eventPublisher, emailVerificationTokens);
  const changePasswordUseCase = new ChangePasswordUseCase(userRepository, emailService, notificationClient);
  const requestPasswordResetUseCase = new RequestPasswordResetUseCase(userRepository, passwordResetTokens, emailService);
  const resetPasswordUseCase = new ResetPasswordUseCase(changePasswordUseCase, passwordResetTokens);

  return {
    userRepository,
    createUserUseCase,
    updateUserUseCase,
    verifyEmailUseCase,
    requestPasswordResetUseCase,
    resetPasswordUseCase
  };
})();

const normalizeDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

const mapUserForAuth = (user: any) => {
  const dto = UserMapper.toResponseDto(user);
  return {
    ...dto,
    isEmailVerified: dto.emailVerified,
    isPhoneVerified: dto.phoneVerified,
    failedLoginAttempts: dto.metadata?.loginAttempts ?? 0,
    lockoutUntil: dto.metadata?.accountLockedUntil ?? undefined,
    lastLoginAt: dto.lastLoginAt ?? undefined,
    twoFactorEnabled: false,
    twoFactorSecret: undefined
  };
};

export async function findUserById(userId: string): Promise<any | null> {
  const user = await context.userRepository.findById(userId);
  return user ? mapUserForAuth(user) : null;
}

export async function findUserByEmail(email: string): Promise<any | null> {
  const user = await context.userRepository.findByEmail(email);
  return user ? mapUserForAuth(user) : null;
}

export async function createUser(userData: {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  role?: string;
}): Promise<any> {
  const created = await context.createUserUseCase.execute({
    email: userData.email,
    phoneNumber: userData.phoneNumber as any,
    firstName: userData.firstName as any,
    lastName: userData.lastName as any,
    dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : undefined,
    role: userData.role as any
  } as any);
  return mapUserForAuth(created);
}

export async function updateUserAuthState(
  userId: string,
  updates: { failedLoginAttempts?: number; lockoutUntil?: string | Date | null; lastLoginAt?: string | Date | null }
): Promise<any | null> {
  const data: Record<string, any> = {};
  if (updates.failedLoginAttempts !== undefined) {
    data.failedLoginAttempts = updates.failedLoginAttempts;
  }
  if (updates.lockoutUntil !== undefined) {
    data.lockoutUntil = normalizeDate(updates.lockoutUntil);
  }
  if (updates.lastLoginAt !== undefined) {
    data.lastLoginAt = normalizeDate(updates.lastLoginAt);
  }

  if (Object.keys(data).length > 0) {
    await prisma.user_User.update({
      where: { id: userId },
      data
    });
  }

  const user = await context.userRepository.findById(userId);
  return user ? mapUserForAuth(user) : null;
}

export async function verifyEmail(userId: string, verificationToken: string): Promise<boolean> {
  const result = await context.verifyEmailUseCase.execute({ userId, verificationToken });
  return result.emailVerified;
}

export async function updatePassword(userId: string, newPasswordHash: string): Promise<void> {
  await context.userRepository.updatePassword(userId, newPasswordHash);
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await context.userRepository.recordSuccessfulLogin(userId);
}

export async function recordFailedLogin(userId: string): Promise<void> {
  await context.userRepository.recordFailedLogin(userId);
}

export async function emailExists(email: string): Promise<boolean> {
  return context.userRepository.emailExists(email);
}

export async function searchUsers(query: string, limit = 50): Promise<any[]> {
  const users = await context.userRepository.search(query, limit, 0);
  return users.map(mapUserForAuth);
}
