import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  it('encrypt/decrypt roundtrip works with hashed key fallback', () => {
    const service = new EncryptionService('short-key');
    const plaintext = 'totp-secret-value';

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(encrypted.split(':')).toHaveLength(3);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypt/decrypt roundtrip works with 32-char utf8 key', () => {
    const service = new EncryptionService('12345678901234567890123456789012');
    const plaintext = 'backup-code-payload';

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('encrypt/decrypt roundtrip works with 64-char hex key', () => {
    const service = new EncryptionService(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    );
    const plaintext = 'mfa-session';

    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('decrypt throws for invalid data format', () => {
    const service = new EncryptionService('short-key');

    expect(() => service.decrypt('invalid')).toThrow('Invalid encrypted data format.');
    expect(() => service.decrypt('aa:bb')).toThrow('Invalid encrypted data format.');
  });

  it('decrypt throws when ciphertext/auth tag is tampered', () => {
    const service = new EncryptionService('short-key');
    const encrypted = service.encrypt('sensitive');
    const [iv, authTag, ciphertext] = encrypted.split(':');

    const tampered = `${iv}:${authTag}:${ciphertext.slice(0, -1)}0`;
    expect(() => service.decrypt(tampered)).toThrow();
  });
});
