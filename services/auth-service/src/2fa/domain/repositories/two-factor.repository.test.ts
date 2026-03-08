import { TwoFactorConfig } from '../entities/two-factor-config.entity';
import type { ITwoFactorRepository } from './two-factor.repository';

class InMemoryTwoFactorRepository implements ITwoFactorRepository {
  private readonly records = new Map<string, TwoFactorConfig>();

  async findByUserId(userId: string): Promise<TwoFactorConfig | null> {
    return this.records.get(userId) ?? null;
  }

  async save(config: TwoFactorConfig): Promise<void> {
    this.records.set(config.userId, config);
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.records.delete(userId);
  }

  async updateBackupCodes(userId: string, codeHashes: string[]): Promise<void> {
    const config = this.records.get(userId);
    if (!config) {
      return;
    }
    config.regenerateBackupCodes(codeHashes);
  }

  async markBackupCodeAsUsed(userId: string, codeHash: string): Promise<void> {
    const config = this.records.get(userId);
    if (!config) {
      return;
    }
    config.useBackupCode(codeHash);
  }
}

const createConfig = (userId: string, backupCodes: string[] = ['hash-1', 'hash-2']) =>
  TwoFactorConfig.create({
    id: `cfg-${userId}`,
    userId,
    method: 'totp',
    secret: 'SECRET',
    backupCodes: [...backupCodes],
    isEnabled: true,
    isVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });

describe('ITwoFactorRepository contract', () => {
  it('supports save/find/update/mark-used/delete operations', async () => {
    const repository = new InMemoryTwoFactorRepository();
    const config = createConfig('user-1');

    await repository.save(config);
    await expect(repository.findByUserId('user-1')).resolves.toBe(config);

    await repository.updateBackupCodes('user-1', ['new-hash']);
    await expect(repository.findByUserId('user-1')).resolves.toBe(config);
    expect(config.backupCodes).toEqual(['new-hash']);

    await repository.updateBackupCodes('user-1', ['use-me', 'keep-me']);
    await repository.markBackupCodeAsUsed('user-1', 'use-me');
    expect(config.backupCodes).toEqual(['keep-me']);

    await repository.deleteByUserId('user-1');
    await expect(repository.findByUserId('user-1')).resolves.toBeNull();
  });
});
