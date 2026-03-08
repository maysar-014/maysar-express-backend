import { TwoFactorConfig } from '../../domain/entities/two-factor-config.entity';
import type { ITwoFactorRepository } from '../../domain/repositories/two-factor.repository';
import { GetTwoFactorStatusUseCase } from './get-two-factor-status.use-case';

const createConfig = (overrides?: Partial<Parameters<typeof TwoFactorConfig.create>[0]>) =>
  TwoFactorConfig.create({
    id: 'cfg-1',
    userId: 'user-1',
    method: 'totp',
    secret: 'SECRET',
    backupCodes: ['h1', 'h2', 'h3'],
    isEnabled: true,
    isVerified: true,
    deviceName: 'iPhone',
    lastUsedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  });

describe('GetTwoFactorStatusUseCase', () => {
  let repository: jest.Mocked<ITwoFactorRepository>;
  let useCase: GetTwoFactorStatusUseCase;

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      deleteByUserId: jest.fn(),
      updateBackupCodes: jest.fn(),
      markBackupCodeAsUsed: jest.fn()
    };
    useCase = new GetTwoFactorStatusUseCase(repository);
  });

  it('returns null when user has no 2fa configuration', async () => {
    repository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute('user-1')).resolves.toBeNull();
  });

  it('maps entity fields into status DTO', async () => {
    const config = createConfig();
    repository.findByUserId.mockResolvedValue(config);

    const result = await useCase.execute('user-1');

    expect(result).toEqual({
      isEnabled: true,
      isVerified: true,
      method: 'totp',
      deviceName: 'iPhone',
      backupCodesCount: 3,
      lastUsedAt: new Date('2026-01-01T00:00:00.000Z')
    });
  });
});
