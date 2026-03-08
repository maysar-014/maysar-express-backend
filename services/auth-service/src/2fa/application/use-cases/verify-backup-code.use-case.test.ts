import { BackupCodeEngine } from '../../domain/engines/backup-code.engine';
import { TwoFactorConfig } from '../../domain/entities/two-factor-config.entity';
import type { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { VerifyBackupCodeUseCase } from './verify-backup-code.use-case';

const createConfig = (overrides?: Partial<Parameters<typeof TwoFactorConfig.create>[0]>) =>
  TwoFactorConfig.create({
    id: 'cfg-1',
    userId: 'user-1',
    method: 'totp',
    secret: 'SECRET',
    backupCodes: ['hash-1', 'hash-2'],
    isEnabled: true,
    isVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  });

describe('VerifyBackupCodeUseCase', () => {
  let repository: jest.Mocked<ITwoFactorRepository>;
  let useCase: VerifyBackupCodeUseCase;

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      deleteByUserId: jest.fn(),
      updateBackupCodes: jest.fn(),
      markBackupCodeAsUsed: jest.fn()
    };
    useCase = new VerifyBackupCodeUseCase(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns false when config is missing or disabled', async () => {
    repository.findByUserId.mockResolvedValueOnce(null);
    await expect(useCase.execute('user-1', 'CODE')).resolves.toBe(false);

    repository.findByUserId.mockResolvedValueOnce(createConfig({ isEnabled: false }));
    await expect(useCase.execute('user-1', 'CODE')).resolves.toBe(false);
  });

  it('consumes matched backup code and persists updated config', async () => {
    const config = createConfig();
    repository.findByUserId.mockResolvedValue(config);
    jest
      .spyOn(BackupCodeEngine, 'verifyCode')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(useCase.execute('user-1', 'CODE')).resolves.toBe(true);
    expect(BackupCodeEngine.verifyCode).toHaveBeenNthCalledWith(1, 'CODE', 'hash-1');
    expect(BackupCodeEngine.verifyCode).toHaveBeenNthCalledWith(2, 'CODE', 'hash-2');
    expect(config.backupCodes).toEqual(['hash-1']);
    expect(repository.save).toHaveBeenCalledWith(config);
  });

  it('returns false when no backup code matches', async () => {
    repository.findByUserId.mockResolvedValue(createConfig());
    jest.spyOn(BackupCodeEngine, 'verifyCode').mockResolvedValue(false);

    await expect(useCase.execute('user-1', 'WRONG')).resolves.toBe(false);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
