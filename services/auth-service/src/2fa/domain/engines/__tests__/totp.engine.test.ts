import { TotpEngine } from '../totp.engine';

// Mock speakeasy
jest.mock('speakeasy', () => ({
    totp: {
        verify: jest.fn(),
        generate: jest.fn()
    },
    otpauthURL: jest.fn()
}));

import * as speakeasy from 'speakeasy';

describe('TotpEngine', () => {
    const mockSecret = 'JBSWY3DPEHPK3PXP';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyCode', () => {
        it('should return true for valid code', () => {
            (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

            const result = TotpEngine.verifyCode(mockSecret, '123456');
            expect(result).toBe(true);
            expect(speakeasy.totp.verify).toHaveBeenCalledWith(expect.objectContaining({
                secret: mockSecret,
                token: '123456',
                window: 1
            }));
        });

        it('should return false for invalid code', () => {
            (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

            const result = TotpEngine.verifyCode(mockSecret, '000000');
            expect(result).toBe(false);
        });
    });

    describe('generateCode', () => {
        it('should generate a code', () => {
            (speakeasy.totp.generate as jest.Mock).mockReturnValue('123456');

            const code = TotpEngine.generateCode(mockSecret);
            expect(code).toBe('123456');
        });
    });

    describe('generateQRCodeUri', () => {
        it('should generate URI', () => {
            (speakeasy.otpauthURL as jest.Mock).mockReturnValue('otpauth://totp/...');

            const uri = TotpEngine.generateQRCodeUri(mockSecret, 'user@example.com', 'Maysar');
            expect(uri).toContain('otpauth://');
        });
    });
});
