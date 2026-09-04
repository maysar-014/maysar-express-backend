import { ForgotPasswordUseCase } from '../forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let mockUserRepository: any;
  let mockPasswordResetRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
    };
    mockPasswordResetRepository = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new ForgotPasswordUseCase(mockUserRepository, mockPasswordResetRepository);
  });

  it('should reject invalid or missing email formats', async () => {
    const resultMissing = await useCase.execute({ email: '' });
    expect(resultMissing.success).toBe(false);
    expect(resultMissing.message).toContain('email address is required');

    const resultInvalid = await useCase.execute({ email: 'not-an-email' });
    expect(resultInvalid.success).toBe(false);
    expect(resultInvalid.message).toContain('email address is required');
  });

  it('should return anti-enumeration generic message when email does not exist', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute({ email: 'unknown@example.com' });
    expect(result.success).toBe(true);
    expect(result.message).toContain('If an account exists');
    expect(mockPasswordResetRepository.create).not.toHaveBeenCalled();
  });

  it('should generate a token and save to repository when user exists', async () => {
    const mockUser = { id: 'user-123', email: 'user@example.com' };
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);

    const result = await useCase.execute({ email: 'user@example.com', baseUrl: 'http://localhost:3000' });
    expect(result.success).toBe(true);
    expect(result.message).toContain('If an account exists');

    expect(mockPasswordResetRepository.create).toHaveBeenCalledTimes(1);
    const createdToken = mockPasswordResetRepository.create.mock.calls[0][0];
    expect(createdToken.userId).toBe('user-123');
    expect(createdToken.token).toHaveLength(64);
    expect(createdToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
