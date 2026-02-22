import { TotpSecret } from '../totp-secret.value-object';

jest.mock('speakeasy', () => ({
    generateSecret: jest.fn().mockReturnValue({ base32: 'MOCKSECRETBASE32' }),
    otpauthURL: jest.fn().mockReturnValue('otpauth://...')
}));

describe('TotpSecret Value Object', () => {
    describe('generate', () => {
        it('should generate new secret', () => {
            const secret = TotpSecret.generate();
            expect(secret.getValue()).toBe('MOCKSECRETBASE32');
        });
    });

    describe('fromString', () => {
        it('should create from valid base32 string', () => {
            const valid = 'MOCKSECRETBASE32';
            const secret = TotpSecret.fromString(valid);
            expect(secret.getValue()).toBe(valid);
        });

        it('should throw on invalid chars', () => {
            expect(() => TotpSecret.fromString('Invalid@#')).toThrow('Invalid TOTP secret format');
        });
    });

    describe('toUri', () => {
        it('should generate otpauth uri', () => {
            const secret = TotpSecret.generate();
            const uri = secret.toUri('user@example.com', 'Maysar');
            expect(uri).toContain('otpauth://');
        });
    });
});
