import { BackupCodeEngine } from '../backup-code.engine';
import * as bcrypt from 'bcrypt';

// Mock bcrypt to avoid slow tests
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_secret'),
    compare: jest.fn().mockImplementation((plain, hash) => Promise.resolve(hash === 'hashed_secret' && plain.length > 0))
}));

describe('BackupCodeEngine', () => {
    describe('generateCodes', () => {
        it('should generate requested number of codes', async () => {
            const codes = await BackupCodeEngine.generateCodes(5);
            expect(codes).toHaveLength(5);
            expect(codes[0].plain).toBeDefined();
            expect(codes[0].hash).toBeDefined();
        });
    });

    describe('verifyCode', () => {
        it('should verify correct code', async () => {
            const result = await BackupCodeEngine.verifyCode('ANY_CODE', 'hashed_secret');
            expect(result).toBe(true);
        });

        it('should reject incorrect code', async () => {
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);
            const result = await BackupCodeEngine.verifyCode('WRONG', 'hashed_secret');
            expect(result).toBe(false);
        });
    });

    describe('formatCode', () => {
        it('should format code with dashes', () => {
            const formatted = BackupCodeEngine.formatCode('ABCD1234EF');
            // Expecting something like ABCD-1234-EF
            expect(formatted).toBe('ABCD-1234-EF');
        });
    });
});
