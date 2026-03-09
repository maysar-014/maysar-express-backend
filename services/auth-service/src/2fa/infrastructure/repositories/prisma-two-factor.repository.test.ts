import { PrismaTwoFactorRepository } from './prisma-two-factor.repository';
import { TwoFactorConfig } from '../../domain/entities/two-factor-config.entity';

const createConfig = () =>
  TwoFactorConfig.create({
    id: 'cfg-1',
    userId: 'user-1',
    method: 'totp',
    secret: 'plain-secret',
    backupCodes: ['hash-1', 'hash-2'],
    isEnabled: true,
    isVerified: true,
    deviceName: 'iPhone',
    lastUsedAt: new Date('2026-03-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-03-01T00:00:00.000Z')
  });

describe('PrismaTwoFactorRepository', () => {
  const prisma = {
    user_TwoFactorAuth: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      update: jest.fn()
    },
    auth_User: {
      update: jest.fn()
    }
  };

  const encryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn()
  };

  let repository: PrismaTwoFactorRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new PrismaTwoFactorRepository(prisma as never, encryptionService as never);
  });

  it('returns null when no config exists', async () => {
    prisma.user_TwoFactorAuth.findUnique.mockResolvedValue(null);
    await expect(repository.findByUserId('missing')).resolves.toBeNull();
  });

  it('finds config by user id and decrypts secret', async () => {
    prisma.user_TwoFactorAuth.findUnique.mockResolvedValue({
      id: 'cfg-1',
      userId: 'user-1',
      method: 'totp',
      secret: 'encrypted-secret',
      backupCodes: ['hash-1', 'hash-2'],
      isEnabled: true,
      isVerified: true,
      deviceName: 'Pixel',
      lastUsedAt: new Date('2026-03-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-02T00:00:00.000Z')
    });
    encryptionService.decrypt.mockReturnValue('decrypted-secret');

    const config = await repository.findByUserId('user-1');

    expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-secret');
    expect(config?.userId).toBe('user-1');
    expect(config?.secret).toBe('decrypted-secret');
    expect(config?.backupCodes).toEqual(['hash-1', 'hash-2']);
  });

  it('saves config with encrypted secret and syncs auth user flags', async () => {
    const config = createConfig();
    encryptionService.encrypt.mockReturnValue('enc-secret');

    await repository.save(config);

    expect(prisma.user_TwoFactorAuth.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          secret: 'enc-secret',
          userId: 'user-1'
        }),
        update: expect.objectContaining({
          secret: 'enc-secret'
        })
      })
    );
    expect(prisma.auth_User.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: 'enc-secret'
      }
    });
  });

  it('deletes config and clears auth user two-factor flags', async () => {
    await repository.deleteByUserId('user-2');

    expect(prisma.user_TwoFactorAuth.delete).toHaveBeenCalledWith({ where: { userId: 'user-2' } });
    expect(prisma.auth_User.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });
  });

  it('updates backup codes atomically', async () => {
    await repository.updateBackupCodes('user-3', ['hash-a', 'hash-b']);

    expect(prisma.user_TwoFactorAuth.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-3' },
        data: expect.objectContaining({
          backupCodes: ['hash-a', 'hash-b'],
          updatedAt: expect.any(Date)
        })
      })
    );
  });

  it('marks backup code as used by removing the consumed hash', async () => {
    prisma.user_TwoFactorAuth.findUnique.mockResolvedValueOnce({
      backupCodes: ['hash-1', 'hash-2', 'hash-3']
    });

    await repository.markBackupCodeAsUsed('user-4', 'hash-2');

    expect(prisma.user_TwoFactorAuth.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-4' },
        data: expect.objectContaining({
          backupCodes: ['hash-1', 'hash-3'],
          updatedAt: expect.any(Date)
        })
      })
    );
  });

  it('is a no-op when marking backup code for missing user config', async () => {
    prisma.user_TwoFactorAuth.findUnique.mockResolvedValueOnce(null);

    await repository.markBackupCodeAsUsed('missing-user', 'hash-1');

    expect(prisma.user_TwoFactorAuth.update).not.toHaveBeenCalled();
  });
});
