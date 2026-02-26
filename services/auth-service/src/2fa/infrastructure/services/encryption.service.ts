import * as crypto from 'crypto';

export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;

    constructor(encryptionKey: string) {
        if (!encryptionKey || (encryptionKey.length !== 32 && encryptionKey.length !== 64)) {
            // If key is not 32 bytes (hex 64), hash it to get a 32-byte key
            this.key = crypto.createHash('sha256').update(encryptionKey).digest();
        } else {
            this.key = Buffer.from(encryptionKey, encryptionKey.length === 64 ? 'hex' : 'utf8');
        }
    }

    /**
     * Encrypts plaintext using AES-256-GCM
     * Returns formatted string: iv:authTag:ciphertext
     */
    public encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    /**
     * Decrypts ciphertext formatted as iv:authTag:ciphertext
     */
    public decrypt(ciphertext: string): string {
        const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

        if (!ivHex || !authTagHex || !encrypted) {
            throw new Error('Invalid encrypted data format.');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}
