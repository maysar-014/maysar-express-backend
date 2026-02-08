import { FingerprintAlgorithm, FingerprintInput } from '../../algorithms/fingerprint.algorithm';

describe('FingerprintAlgorithm', () => {
    describe('generateFingerprint', () => {
        it('should generate consistent fingerprint for same input', () => {
            const input: FingerprintInput = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'electronics',
            };

            const fp1 = FingerprintAlgorithm.generateFingerprint(input);
            const fp2 = FingerprintAlgorithm.generateFingerprint(input);

            expect(fp1).toBe(fp2);
        });

        it('should generate different fingerprints for different brands', () => {
            const input1: FingerprintInput = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'electronics',
            };

            const input2: FingerprintInput = {
                brand: 'Samsung',
                model: 'iPhone 15',
                categoryId: 'electronics',
            };

            const fp1 = FingerprintAlgorithm.generateFingerprint(input1);
            const fp2 = FingerprintAlgorithm.generateFingerprint(input2);

            expect(fp1).not.toBe(fp2);
        });

        it('should generate different fingerprints for different categories', () => {
            const input1: FingerprintInput = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'electronics',
            };

            const input2: FingerprintInput = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'phones',
            };

            const fp1 = FingerprintAlgorithm.generateFingerprint(input1);
            const fp2 = FingerprintAlgorithm.generateFingerprint(input2);

            expect(fp1).not.toBe(fp2);
        });

        it('should include attributes in fingerprint', () => {
            const input1: FingerprintInput = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'electronics',
                attributes: { processor: 'A17' },
            };

            const input2: FingerprintInput = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'electronics',
                attributes: { processor: 'A16' },
            };

            const fp1 = FingerprintAlgorithm.generateFingerprint(input1);
            const fp2 = FingerprintAlgorithm.generateFingerprint(input2);

            expect(fp1).not.toBe(fp2);
        });

        it('should normalize input before hashing', () => {
            const input1: FingerprintInput = {
                brand: 'APPLE',
                model: 'iPhone 15',
                categoryId: 'electronics',
            };

            const input2: FingerprintInput = {
                brand: 'apple',
                model: 'iphone 15',
                categoryId: 'electronics',
            };

            const fp1 = FingerprintAlgorithm.generateFingerprint(input1);
            const fp2 = FingerprintAlgorithm.generateFingerprint(input2);

            expect(fp1).toBe(fp2);
        });

        it('should generate SHA-256 hash (64 hex chars)', () => {
            const input: FingerprintInput = {
                brand: 'Apple',
                model: 'iPhone 15',
                categoryId: 'electronics',
            };

            const fp = FingerprintAlgorithm.generateFingerprint(input);

            expect(fp).toHaveLength(64);
            expect(fp).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('validateFingerprint', () => {
        it('should validate correct SHA-256 fingerprint', () => {
            const validFp = 'a'.repeat(64);
            expect(FingerprintAlgorithm.validateFingerprint(validFp)).toBe(true);
        });

        it('should reject fingerprint with wrong length', () => {
            const invalidFp = 'a'.repeat(32);
            expect(FingerprintAlgorithm.validateFingerprint(invalidFp)).toBe(false);
        });

        it('should reject fingerprint with invalid characters', () => {
            const invalidFp = 'g'.repeat(64);
            expect(FingerprintAlgorithm.validateFingerprint(invalidFp)).toBe(false);
        });

        it('should reject uppercase fingerprint', () => {
            const invalidFp = 'A'.repeat(64);
            expect(FingerprintAlgorithm.validateFingerprint(invalidFp)).toBe(false);
        });
    });
});
