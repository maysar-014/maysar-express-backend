import { PiiEncryptionService } from './pii-encryption.service';

describe('PiiEncryptionService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PII_ENCRYPTION_KEY: '12345678901234567890123456789012',
      PII_HMAC_SECRET: 'hmac-secret'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('encrypts and decrypts plaintext roundtrip', () => {
    const service = new PiiEncryptionService();
    const encrypted = service.encrypt('sensitive-data');

    expect(encrypted.split(':')).toHaveLength(3);
    expect(service.decrypt(encrypted)).toBe('sensitive-data');
  });

  it('returns input as-is for empty plaintext or non-encrypted ciphertext', () => {
    const service = new PiiEncryptionService();

    expect(service.encrypt('')).toBe('');
    expect(service.decrypt('plain-text')).toBe('plain-text');
  });

  it('throws for malformed encrypted payload', () => {
    const service = new PiiEncryptionService();

    expect(() => service.decrypt('iv:tag')).toThrow('Invalid encrypted data format.');
  });

  it('hashes deterministically', () => {
    const service = new PiiEncryptionService();

    expect(service.hash('abc')).toBe(service.hash('abc'));
    expect(service.hash('abc')).not.toBe(service.hash('def'));
    expect(service.hash('')).toBe('');
  });

  it('requires encryption key', () => {
    process.env = {
      ...originalEnv,
      PII_ENCRYPTION_KEY: ''
    };

    expect(() => new PiiEncryptionService()).toThrow(
      'PII_ENCRYPTION_KEY environment variable is missing.'
    );
  });
});
