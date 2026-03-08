import { BackupCode } from './backup-code.value-object';

describe('BackupCode', () => {
  it('generates verifiable plain/hash pairs and formatted values', async () => {
    const backupCode = await BackupCode.generate();
    const plain = backupCode.getPlain();

    expect(backupCode.getHash()).toBeTruthy();
    expect(plain).toBeTruthy();
    expect(plain?.length).toBe(10);
    expect(backupCode.format()).toContain('-');
    await expect(backupCode.verify(plain ?? '')).resolves.toBe(true);
    await expect(backupCode.verify('WRONGCODE')).resolves.toBe(false);
  });

  it('supports restoring from hash without exposing plain code', async () => {
    const generated = await BackupCode.generate();
    const restored = BackupCode.fromHash(generated.getHash());

    expect(restored.getPlain()).toBeUndefined();
    expect(restored.format()).toBe('********');
    await expect(restored.verify(generated.getPlain() ?? '')).resolves.toBe(true);
  });
});
