import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class BackupCode {
    private constructor(private readonly hash: string, private readonly plain?: string) { }

    /**
     * Generates a new random backup code and its hash
     */
    public static async generate(): Promise<BackupCode> {
        const plain = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 characters
        const hash = await bcrypt.hash(plain, 10);
        return new BackupCode(hash, plain);
    }

    /**
     * Creates a BackupCode from an existing hash
     */
    public static fromHash(hash: string): BackupCode {
        return new BackupCode(hash);
    }

    public getHash(): string {
        return this.hash;
    }

    /**
     * Only available when generated, not when restored from hash
     */
    public getPlain(): string | undefined {
        return this.plain;
    }

    /**
     * Verifies if a plain code matches the stored hash
     */
    public async verify(plain: string): Promise<boolean> {
        return bcrypt.compare(plain.toUpperCase(), this.hash);
    }

    /**
     * Formats the code for display (e.g., XXXX-XXXX-XX)
     */
    public format(): string {
        if (!this.plain) return '********';
        return this.plain.match(/.{1,4}/g)?.join('-') || this.plain;
    }
}
