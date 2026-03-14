import { CreateUserUseCase } from '../create-user.use-case';
import { UserValidationError } from '../../../domain/errors/user.errors';
import { UserRole } from '../../../domain/types/user.types';

jest.mock('../../sagas/saga-event-handler');

describe('CreateUserUseCase - edge cases', () => {
  const makeSut = (securityOverrides: Partial<any> = {}) => {
    const mockValidationService = { validateUser: jest.fn() };
    const mockUserRepository = {
      emailExists: jest.fn().mockResolvedValue(false),
      phoneExists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockImplementation(async (user: any) => user)
    };

    const mockSecurityPolicy = {
      isSuspiciousEmail: jest.fn().mockReturnValue(false),
      isSuspiciousPhoneNumber: jest.fn().mockReturnValue(false),
      isRateLimited: jest.fn().mockReturnValue(false),
      ...securityOverrides
    };

    const mockEmailService = { sendEmail: jest.fn(), sendVerificationEmail: jest.fn() };
    const mockNotificationClient = { notify: jest.fn() };
    const mockEventPublisher = { publish: jest.fn(), publishMany: jest.fn() };
    const mockEmailVerificationTokens = { create: jest.fn() };

    const sut = new CreateUserUseCase(
      mockUserRepository as any,
      mockValidationService as any,
      mockSecurityPolicy as any,
      mockEventPublisher as any,
      mockEmailVerificationTokens as any,
      mockEmailService as any,
      mockNotificationClient as any
    );
    return { sut, mockValidationService, mockSecurityPolicy, mockEmailService, mockNotificationClient, mockUserRepository };
  };

  it('creates user when data is valid', async () => {
    const { sut } = makeSut();

    const dto = {
      email: 'test@example.com',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.BUYER
    } as any;

    const user = await sut.execute(dto);
    expect(user).toBeDefined();
    expect(user.email.getValue()).toBe('test@example.com');
    expect(user.phoneNumber.toString()).toContain('+255');
  });

  it('throws when email is suspicious', async () => {
    const { sut, mockSecurityPolicy } = makeSut({ isSuspiciousEmail: jest.fn().mockReturnValue(true) });

    const dto = {
      email: 'bad@spamdomain.test',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.BUYER
    } as any;

    await expect(sut.execute(dto)).rejects.toBeInstanceOf(UserValidationError);
    expect(mockSecurityPolicy.isSuspiciousEmail).toHaveBeenCalledWith(dto.email);
  });

  it('throws when phone number format is invalid', async () => {
    const { sut } = makeSut();

    const dto = {
      email: 'test@example.com',
      phoneNumber: 'invalid-phone',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.BUYER
    } as any;

    await expect(sut.execute(dto)).rejects.toBeInstanceOf(UserValidationError);
  });

  it('throws when role is invalid', async () => {
    const { sut } = makeSut();

    const dto = {
      email: 'test@example.com',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: 'not-a-role'
    } as any;

    await expect(sut.execute(dto)).rejects.toBeInstanceOf(UserValidationError);
  });
});
