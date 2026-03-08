import { TotpEngine } from '../../domain/engines/totp.engine';
import { TwoFactorConfig } from '../../domain/entities/two-factor-config.entity';
import type { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { VerifyTwoFactorLoginUseCase } from './verify-two-factor-login.use-case';

const createConfig = (overrides?: Partial<Parameters<typeof TwoFactorConfig.create>[0]>) =>
  TwoFactorConfig.create({
    id: 'cfg-1',
    userId: 'user-1',
    method: 'totp',
    secret: 'SECRET',
    backupCodes: ['h1'],
    isEnabled: true,
    isVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  });

describe('VerifyTwoFactorLoginUseCase', () => {
  let repository: jest.Mocked<ITwoFactorRepository>;
  let useCase: VerifyTwoFactorLoginUseCase;

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      deleteByUserId: jest.fn(),
      updateBackupCodes: jest.fn(),
      markBackupCodeAsUsed: jest.fn()
    };
    useCase = new VerifyTwoFactorLoginUseCase(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false when config is missing or disabled', async () => {
    repository.findByUserId.mockResolvedValueOnce(null);
    await expect(useCase.execute('user-1', '123456')).resolves.toBe(false);

    repository.findByUserId.mockResolvedValueOnce(createConfig({ isEnabled: false }));
    await expect(useCase.execute('user-1', '123456')).resolves.toBe(false);
  });

  it('persists config when provided code is valid', async () => {
    const config = createConfig();
    repository.findByUserId.mockResolvedValue(config);
    jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(true);

    await expect(useCase.execute('user-1', '123456')).resolves.toBe(true);
    expect(TotpEngine.verifyCode).toHaveBeenCalledWith('SECRET', '123456');
    expect(config.lastUsedAt).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledWith(config);
  });

  it('does not persist config when provided code is invalid', async () => {
    const config = createConfig();
    repository.findByUserId.mockResolvedValue(config);
    jest.spyOn(TotpEngine, 'verifyCode').mockReturnValue(false);

    await expect(useCase.execute('user-1', '000000')).resolves.toBe(false);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
