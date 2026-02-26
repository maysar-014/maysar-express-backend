import * as speakeasy from 'speakeasy';
import { TotpSecret } from '../value-objects/totp-secret.value-object';

export class TotpEngine {
    /**
     * Verifies a TOTP code against a secret
     * Uses time window tolerance (±1 window for clock skew)
     */
    public static verifyCode(secret: string, code: string): boolean {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code,
            window: 1
        });
    }

    /**
     * Generates a current TOTP code for a secret (for testing)
     */
    public static generateCode(secret: string): string {
        return speakeasy.totp.generate({
            secret: secret,
            encoding: 'base32'
        });
    }

    /**
     * Generates a new cryptographically secure secret
     */
    public static generateSecret(): TotpSecret {
        return TotpSecret.generate();
    }

    /**
     * Generates the URI for QR code generation
     */
    public static generateQRCodeUri(secret: string, email: string, issuer: string): string {
        return speakeasy.otpauthURL({
            secret: secret,
            label: encodeURIComponent(email),
            issuer: encodeURIComponent(issuer),
            encoding: 'base32'
        });
    }
}
