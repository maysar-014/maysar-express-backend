import { FingerprintAlgorithm, FingerprintInput } from '../algorithms/fingerprint.algorithm';

export class ProductFingerprint {
    constructor(
        public readonly value: string,
        public readonly version: number = 1,
        public readonly categoryId: string
    ) { }

    static generate(input: FingerprintInput): ProductFingerprint {
        const value = FingerprintAlgorithm.generateFingerprint(input);
        return new ProductFingerprint(value, 1, input.categoryId);
    }

    matches(other: ProductFingerprint): boolean {
        return (
            this.version === other.version &&
            this.categoryId === other.categoryId &&
            this.value === other.value
        );
    }

    toString(): string {
        return this.value;
    }
}
