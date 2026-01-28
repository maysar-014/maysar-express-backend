import { CreateUserUseCase, UserRegistrationService } from '../create-user.use-case';
import { UserValidationService } from '../../../domain/services/user-validation.service';
import { UserSecurityPolicy } from '../../../domain/policies/user-security.policy';
import { CreateUserDto } from '../../dto/user.dto';
import { UserAlreadyExistsError, UserValidationError } from '../../../domain/errors/user.errors';

describe('CreateUserUseCase - comprehensive', () => {
  let validationSvc: jest.Mocked<UserValidationService>;
  let securityPolicy: jest.Mocked<UserSecurityPolicy>;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    validationSvc = { validateUser: jest.fn() } as any;
    securityPolicy = {
      isSuspiciousEmail: jest.fn().mockReturnValue(false),
      isSuspiciousPhoneNumber: jest.fn().mockReturnValue(false),
      isRateLimited: jest.fn().mockReturnValue(false)
    } as any;

    useCase = new CreateUserUseCase(validationSvc, securityPolicy as any);
  });

  function baseDto(): CreateUserDto {
    return {
      email: 'good@example.com',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: 'buyer'
    } as any;
  }

  test('rejects invalid email', async () => {
    const dto = { ...baseDto(), email: 'bad-email' };
    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(UserValidationError);
  });

  test('rejects invalid phone', async () => {
    const dto = { ...baseDto(), phoneNumber: '12345' };
    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(UserValidationError);
  });

  test('rejects short first/last names', async () => {
    await expect(useCase.execute({ ...baseDto(), firstName: 'A' })).rejects.toBeInstanceOf(UserValidationError);
    await expect(useCase.execute({ ...baseDto(), lastName: 'B' })).rejects.toBeInstanceOf(UserValidationError);
  });

  test('rejects invalid role', async () => {
    await expect(useCase.execute({ ...baseDto(), role: 'unknown' } as any)).rejects.toBeInstanceOf(UserValidationError);
  });

  test('throws when existing user found', async () => {
    // spy on private method to simulate existing user
    jest.spyOn(CreateUserUseCase.prototype as any, 'findUserByEmailOrPhone').mockResolvedValue({ id: 'u1' } as any);
    await expect(useCase.execute(baseDto())).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  test('security policy rejects suspicious email/phone and rate limit', async () => {
    (securityPolicy.isSuspiciousEmail as jest.Mock).mockReturnValueOnce(true);
    await expect(useCase.execute(baseDto())).rejects.toBeInstanceOf(UserValidationError);

    (securityPolicy.isSuspiciousEmail as jest.Mock).mockReturnValue(false);
    (securityPolicy.isSuspiciousPhoneNumber as jest.Mock).mockReturnValueOnce(true);
    await expect(useCase.execute(baseDto())).rejects.toBeInstanceOf(UserValidationError);

    (securityPolicy.isSuspiciousPhoneNumber as jest.Mock).mockReturnValue(false);
    (securityPolicy.isRateLimited as jest.Mock).mockReturnValueOnce(true);
    await expect(useCase.execute(baseDto())).rejects.toBeInstanceOf(UserValidationError);
  });

  test('business rules: underage and invalid businessId', async () => {
    const underageDto = { ...baseDto(), dateOfBirth: new Date(new Date().getFullYear() - 10, 0, 1) } as any;
    await expect(useCase.execute(underageDto)).rejects.toBeInstanceOf(UserValidationError);

    const badBiz = { ...baseDto(), businessId: 'BIZ123' } as any; // too short
    await expect(useCase.execute(badBiz)).rejects.toBeInstanceOf(UserValidationError);
  });

  test('successful creation returns a User instance', async () => {
    const dto = baseDto();
    const user = await useCase.execute(dto);
    expect(user).toBeDefined();
    expect(user.email.toString()).toBe(dto.email);
  });
});

describe('UserRegistrationService', () => {
  test('registerBusinessUser enforces seller role and businessId presence', async () => {
    const mockUseCase = { execute: jest.fn() } as any;
    const svc = new UserRegistrationService(mockUseCase);

    await expect(svc.registerBusinessUser({ email: 'a@b.com', phoneNumber: '+255712345678', firstName: 'A', lastName: 'B', role: 'buyer' } as any, 'BIZ123456')).rejects.toBeInstanceOf(UserValidationError);
    await expect(svc.registerBusinessUser({ ...({} as any), role: 'seller' } as any, '')).rejects.toBeInstanceOf(UserValidationError);

    mockUseCase.execute.mockResolvedValue({ id: 'ok' } as any);
    const res = await svc.registerBusinessUser({ email: 'a@b.com', phoneNumber: '+255712345678', firstName: 'A', lastName: 'B', role: 'seller' } as any, 'BIZ123456');
    expect(res).toBeDefined();
  });
});
