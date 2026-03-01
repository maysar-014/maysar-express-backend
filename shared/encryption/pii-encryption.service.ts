import * as crypto from 'crypto';

export class PiiEncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;
    private readonly hmacSecret: string;

    constructor() {
        const encryptionKey = process.env.PII_ENCRYPTION_KEY;
        this.hmacSecret = process.env.PII_HMAC_SECRET || 'default-hmac-secret-for-dev';

        if (!encryptionKey) {
            throw new Error('PII_ENCRYPTION_KEY environment variable is missing.');
        }

        if (encryptionKey.length !== 32 && encryptionKey.length !== 64) {
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
        if (!plaintext) return plaintext;
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
        if (!ciphertext || !ciphertext.includes(':')) return ciphertext;

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

    /**
     * Hashes a value deterministically for index lookups using HMAC-SHA256
     */
    public hash(value: string): string {
        if (!value) return value;
        return crypto.createHmac('sha256', this.hmacSecret).update(value).digest('hex');
    }
}
