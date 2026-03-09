import { TwoFactorConfig } from './two-factor-config.entity';

const createConfig = () =>
  TwoFactorConfig.create({
    id: 'cfg-1',
    userId: 'user-1',
    method: 'totp',
    secret: 'plain-secret',
    backupCodes: ['code-1', 'code-2'],
    isEnabled: false,
    isVerified: false,
    deviceName: 'Pixel',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });

describe('TwoFactorConfig', () => {
  it('exposes config properties and serializes back to JSON', () => {
    const config = createConfig();
    const json = config.toJSON();

    expect(config.id).toBe('cfg-1');
    expect(config.userId).toBe('user-1');
    expect(config.method).toBe('totp');
    expect(config.secret).toBe('plain-secret');
    expect(config.backupCodes).toEqual(['code-1', 'code-2']);
    expect(config.deviceName).toBe('Pixel');
    expect(json).toEqual(expect.objectContaining({ id: 'cfg-1', userId: 'user-1' }));
  });

  it('enforces verification before enabling and updates timestamps', () => {
    const config = createConfig();

    expect(() => config.enable()).toThrow('Cannot enable two-factor authentication before it is verified.');

    config.verify();
    config.enable();
    expect(config.isVerified).toBe(true);
    expect(config.isEnabled).toBe(true);
    expect(config.updatedAt).toBeInstanceOf(Date);
  });

  it('supports disable, markAsUsed, backup code consumption and regeneration', () => {
    const config = createConfig();
    config.verify();
    config.enable();

    config.markAsUsed();
    expect(config.lastUsedAt).toBeInstanceOf(Date);

    config.useBackupCode('code-1');
    expect(config.backupCodes).toEqual(['code-2']);
    expect(() => config.useBackupCode('code-1')).toThrow('Invalid or already used backup code.');

    config.regenerateBackupCodes(['new-1', 'new-2']);
    expect(config.backupCodes).toEqual(['new-1', 'new-2']);

    config.disable();
    expect(config.isEnabled).toBe(false);
  });
});
