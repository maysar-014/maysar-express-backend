export class TotpToken {
    private constructor(private readonly value: string) { }

    /**
     * Creates a TotpToken from a string, validating it's a 6-digit code
     */
    public static fromString(token: string): TotpToken {
        const cleanToken = token.trim().replace(/\s/g, '');
        if (!/^\d{6}$/.test(cleanToken)) {
            throw new Error('Invalid TOTP token format. Must be exactly 6 digits.');
        }
        return new TotpToken(cleanToken);
    }

    public getValue(): string {
        return this.value;
    }

    /**
     * Checks if the token is valid for the current time window
     * (Verification itself is handled by the TotpEngine)
     */
    public validate(): boolean {
        return /^\d{6}$/.test(this.value);
    }
}
