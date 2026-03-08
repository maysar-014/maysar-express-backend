import { BackupCodeEngine } from '../../domain/engines/backup-code.engine';
import { TwoFactorConfig } from '../../domain/entities/two-factor-config.entity';
import type { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { RegenerateBackupCodesUseCase } from './regenerate-backup-codes.use-case';

const createConfig = (overrides?: Partial<Parameters<typeof TwoFactorConfig.create>[0]>) =>
  TwoFactorConfig.create({
    id: 'cfg-1',
    userId: 'user-1',
    method: 'totp',
    secret: 'SECRET',
    backupCodes: ['old-hash'],
    isEnabled: true,
    isVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  });

describe('RegenerateBackupCodesUseCase', () => {
  let repository: jest.Mocked<ITwoFactorRepository>;
  let useCase: RegenerateBackupCodesUseCase;

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      deleteByUserId: jest.fn(),
      updateBackupCodes: jest.fn(),
      markBackupCodeAsUsed: jest.fn()
    };
    useCase = new RegenerateBackupCodesUseCase(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when 2fa is not enabled', async () => {
    repository.findByUserId.mockResolvedValue(createConfig({ isEnabled: false }));

    await expect(useCase.execute('user-1')).rejects.toThrow(
      'Two-factor authentication must be enabled to regenerate backup codes.'
    );
  });

  it('replaces hashed codes and returns plain codes', async () => {
    const config = createConfig();
    repository.findByUserId.mockResolvedValue(config);
    jest.spyOn(BackupCodeEngine, 'generateCodes').mockResolvedValue([
      { plain: 'PLAIN001', hash: 'HASH001' },
      { plain: 'PLAIN002', hash: 'HASH002' }
    ]);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(['PLAIN001', 'PLAIN002']);
    expect(config.backupCodes).toEqual(['HASH001', 'HASH002']);
    expect(repository.save).toHaveBeenCalledWith(config);
  });
});
