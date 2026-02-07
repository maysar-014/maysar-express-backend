import * as speakeasy from 'speakeasy';

export class TotpSecret {
    private constructor(private readonly value: string) { }

    /**
     * Generates a new secure TOTP secret
     */
    public static generate(): TotpSecret {
        const secret = speakeasy.generateSecret({ length: 20 });
        return new TotpSecret(secret.base32);
    }

    /**
     * Creates a TotpSecret from an existing string
     */
    public static fromString(secret: string): TotpSecret {
        const vo = new TotpSecret(secret);
        if (!vo.validate()) {
            throw new Error('Invalid TOTP secret format. Must be a valid Base32 string.');
        }
        return vo;
    }

    public getValue(): string {
        return this.value;
    }

    /**
     * Generates the otpauth URI for QR code generation
     */
    public toUri(email: string, issuer: string): string {
        return speakeasy.otpauthURL({
            secret: this.value,
            label: encodeURIComponent(email),
            issuer: encodeURIComponent(issuer),
            encoding: 'base32'
        });
    }

    /**
     * Validates the secret format (Base32)
     */
    public validate(): boolean {
        return /^[A-Z2-7]+=*$/.test(this.value);
    }
}
