import { createHash } from 'crypto';
import { NormalizationAlgorithm } from './normalization.algorithm';

export interface FingerprintInput {
    brand: string;
    model: string;
    categoryId: string;
    attributes?: Record<string, any>;
}

export class FingerprintAlgorithm {
    /**
     * Generates a deterministic fingerprint for a product based on its core attributes.
     * Different categories may use different attributes for fingerprinting.
     */
    static generateFingerprint(input: FingerprintInput): string {
        const { brand, model, categoryId, attributes } = input;

        // 1. Normalize core fields
        const normalizedBrand = NormalizationAlgorithm.normalizeBrand(brand);
        const normalizedModel = NormalizationAlgorithm.normalizeModel(model);
        const normalizedCategory = NormalizationAlgorithm.normalizeCategory(categoryId);

        // 2. Build the fingerprint string
        // Base: category|brand|model
        let fingerprintString = `${normalizedCategory}|${normalizedBrand}|${normalizedModel}`;

        // 3. Add category-specific attributes if needed
        // This is a simplified version. In a real scenario, we might have a strategy pattern
        // to fetch relevant attributes based on category.
        // E.g., for 'clothing', we might want to include 'material' but exclude 'size' and 'color'.
        // For now, we'll exclude dynamic attributes to prevent variant-level proliferation in the main fingerprint,
        // assuming the input 'attributes' only contains core specs (like 'processor' for laptops) if passed.

        if (attributes) {
            // Sort keys to ensure deterministic order
            const sortedKeys = Object.keys(attributes).sort();
            for (const key of sortedKeys) {
                const value = attributes[key];
                if (value !== null && value !== undefined) {
                    const normalizedValue = NormalizationAlgorithm.normalizeText(String(value));
                    fingerprintString += `|${key}:${normalizedValue}`;
                }
            }
        }

        // 4. Hash the string
        return createHash('sha256').update(fingerprintString).digest('hex');
    }

    /**
     * Validates if a string is a valid SHA-256 fingerprint.
     */
    static validateFingerprint(fingerprint: string): boolean {
        return /^[a-f0-9]{64}$/.test(fingerprint);
    }
}
