import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class BackupCodeEngine {
    /**
     * Generates a set of cryptographically secure random backup codes
     */
    public static async generateCodes(count: number = 10): Promise<{ plain: string; hash: string }[]> {
        const codes = [];
        for (let i = 0; i < count; i++) {
            const plain = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 characters
            const hash = await bcrypt.hash(plain, 10);
            codes.push({ plain, hash });
        }
        return codes;
    }

    /**
     * Hashes a backup code for secure storage
     */
    public static async hashCode(code: string): Promise<string> {
        return bcrypt.hash(code.toUpperCase(), 10);
    }

    /**
     * Verifies a plain code against its hashed version
     */
    public static async verifyCode(code: string, hash: string): Promise<boolean> {
        return bcrypt.compare(code.toUpperCase(), hash);
    }

    /**
     * Formats a code for display purposes (e.g., ABCD1234EF -> ABCD-1234-EF)
     */
    public static formatCode(code: string): string {
        return code.match(/.{1,4}/g)?.join('-') || code;
    }
}
