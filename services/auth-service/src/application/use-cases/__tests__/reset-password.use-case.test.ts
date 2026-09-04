import { ResetPasswordUseCase } from '../reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let mockUserRepository: any;
  let mockPasswordResetRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockPasswordResetRepository = {
      findByToken: jest.fn(),
      markAsUsed: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new ResetPasswordUseCase(mockUserRepository, mockPasswordResetRepository, {
      updatePassword: jest.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('should validate required token and password strength', async () => {
    const noToken = await useCase.execute({ token: '', newPassword: 'password123', confirmPassword: 'password123' });
    expect(noToken.success).toBe(false);
    expect(noToken.message).toContain('token is required');

    const shortPwd = await useCase.execute({ token: 'tok-123', newPassword: '123', confirmPassword: '123' });
    expect(shortPwd.success).toBe(false);
    expect(shortPwd.message).toContain('at least 8 characters');

    const mismatch = await useCase.execute({ token: 'tok-123', newPassword: 'password123', confirmPassword: 'password456' });
    expect(mismatch.success).toBe(false);
    expect(mismatch.message).toContain('do not match');
  });

  it('should reject unrecognized token', async () => {
    mockPasswordResetRepository.findByToken.mockResolvedValue(null);

    const result = await useCase.execute({ token: 'invalid-token', newPassword: 'newPassword123', confirmPassword: 'newPassword123' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid or unrecognized reset token');
  });

  it('should reject used or expired token', async () => {
    // Already used token
    mockPasswordResetRepository.findByToken.mockResolvedValueOnce({
      id: 'res-1',
      userId: 'user-1',
      token: 'tok-used',
      used: true,
      expiresAt: new Date(Date.now() + 100000),
    });
    const usedRes = await useCase.execute({ token: 'tok-used', newPassword: 'newPassword123', confirmPassword: 'newPassword123' });
    expect(usedRes.success).toBe(false);
    expect(usedRes.message).toContain('already been used');

    // Expired token
    mockPasswordResetRepository.findByToken.mockResolvedValueOnce({
      id: 'res-2',
      userId: 'user-1',
      token: 'tok-exp',
      used: false,
      expiresAt: new Date(Date.now() - 10000),
    });
    const expRes = await useCase.execute({ token: 'tok-exp', newPassword: 'newPassword123', confirmPassword: 'newPassword123' });
    expect(expRes.success).toBe(false);
    expect(expRes.message).toContain('expired');
  });

  it('should reset password and mark token as used when valid', async () => {
    const mockRecord = {
      id: 'res-100',
      userId: 'user-100',
      token: 'valid-token',
      used: false,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
    const mockUser = { id: 'user-100', email: 'valid@example.com', changePassword: jest.fn() };

    const updatePasswordSpy = jest.fn().mockResolvedValue(undefined);
    mockPasswordResetRepository.findByToken.mockResolvedValue(mockRecord);
    mockUserRepository.findById.mockResolvedValue(mockUser);
    // Wire the updatePassword spy into the use case for this test
    useCase = new ResetPasswordUseCase(mockUserRepository, mockPasswordResetRepository, {
      updatePassword: updatePasswordSpy,
    } as any);

    const result = await useCase.execute({ token: 'valid-token', newPassword: 'newSecretPassword123', confirmPassword: 'newSecretPassword123' });

    expect(result.success).toBe(true);
    expect(result.message).toContain('successfully reset');
    expect(updatePasswordSpy).toHaveBeenCalledTimes(1);
    expect(updatePasswordSpy.mock.calls[0][0]).toBe('user-100');
    expect(mockPasswordResetRepository.markAsUsed).toHaveBeenCalledWith('res-100');
    expect(mockUser.changePassword).toHaveBeenCalledTimes(1);
  });
});
