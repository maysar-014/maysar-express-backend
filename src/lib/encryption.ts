/**
 * Maysar Engineering — Field-Level Encryption for Sensitive Data
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 17: Security by Design — Secure data handling
 *   - Article 18: Financial and Transactional Integrity — Financial records
 *   - Article 7: Resource Efficiency Doctrine
 * 
 * Implements AES-256-GCM authenticated encryption for sensitive financial fields:
 *   - Wallet balances
 *   - Escrow amounts
 *   - Payment card references
 *   - Bank account details
 *   - Any field containing PII or financial data
 * 
 * Encryption key must be provided via ENCRYPTION_KEY environment variable
 * (32-byte base64-encoded key). Managed via AWS KMS, HashiCorp Vault, or equivalent.
 */

import crypto from 'crypto';

const ENCRYPTION_KEY_B64 = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_B64) {
    throw new Error(
        'ENCRYPTION_KEY environment variable is required. ' +
        'Generate with: openssl rand -base64 32'
    );
}

let encryptionKey: Buffer;
try {
    encryptionKey = Buffer.from(ENCRYPTION_KEY_B64, 'base64');
    if (encryptionKey.length !== 32) {
        throw new Error(`ENCRYPTION_KEY must be 32 bytes (256 bits), got ${encryptionKey.length} bytes`);
    }
} catch (error) {
    throw new Error(
        `Invalid ENCRYPTION_KEY: ${error instanceof Error ? error.message : String(error)}. ` +
        'Must be a 32-byte base64-encoded string.'
    );
}

const IV_LENGTH = 16; // AES-GCM IV size
const AUTH_TAG_LENGTH = 16; // AES-GCM authentication tag size

/**
 * Encrypt a string value using AES-256-GCM.
 * 
 * Format: base64(IV || AUTH_TAG || CIPHERTEXT)
 * 
 * @param plaintext - The value to encrypt
 * @returns Base64-encoded encrypted value
 */
export function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypt an encrypted value using AES-256-GCM.
 * 
 * @param encryptedData - Base64-encoded encrypted value (IV || AUTH_TAG || CIPHERTEXT)
 * @returns Decrypted plaintext string
 * @throws {Error} If decryption fails (tampered data, wrong key)
 */
export function decrypt(encryptedData: string): string {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Encrypted data is too short to contain IV and auth tag');
    }
    
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
}

/**
 * Encrypt a numeric value (e.g., wallet balance, escrow amount).
 * 
 * @param value - The number to encrypt
 * @returns Base64-encoded encrypted value
 */
export function encryptNumber(value: number): string {
    return encrypt(value.toString());
}

/**
 * Decrypt an encrypted numeric value.
 * 
 * @param encryptedData - Base64-encoded encrypted value
 * @returns Decrypted number
 */
export function decryptNumber(encryptedData: string): number {
    return parseFloat(decrypt(encryptedData));
}

/**
 * Encrypt an optional string value. Returns null if input is null/undefined.
 */
export function encryptOptional(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined) {
        return value;
    }
    return encrypt(value);
}

/**
 * Decrypt an optional encrypted value. Returns null if input is null/undefined.
 */
export function decryptOptional(value: string | null | undefined): string | null | undefined {
    if (value === null || value === undefined) {
        return value;
    }
    return decrypt(value);
}

/**
 * Check if encryption is properly configured.
 */
export function isEncryptionConfigured(): boolean {
    return !!ENCRYPTION_KEY_B64 && encryptionKey.length === 32;
}

/**
 * Get the key ID for audit logging (first 8 chars of base64 key, never the full key).
 */
export function getKeyId(): string {
    return ENCRYPTION_KEY_B64!.substring(0, 8);
}
