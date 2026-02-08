
export class NormalizationAlgorithm {
    /**
     * Normalizes general text by lowercasing, trimming, removing special symbols,
     * and collapsing whitespace.
     */
    static normalizeText(input: string): string {
        if (!input) return '';
        return input
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '') // Remove symbols
            .replace(/\s+/g, ' ');   // Collapse whitespace
    }

    /**
     * Normalizes product identifiers based on type.
     */
    static normalizeIdentifier(identifier: string, type: 'GTIN' | 'MPN' | 'ISBN'): string {
        if (!identifier) return '';
        const cleaned = identifier.trim().replace(/[-\s]/g, ''); // Remove dashes and spaces

        switch (type) {
            case 'GTIN':
                // GTIN-14 is 14 digits. Pad with zeros if necessary (e.g., UPC to GTIN)
                if (cleaned.length < 14 && /^\d+$/.test(cleaned)) {
                    return cleaned.padStart(14, '0');
                }
                return cleaned;
            case 'ISBN':
                // ISBN-13 is 13 digits.
                if (cleaned.length === 10) {
                    // Convert ISBN-10 to ISBN-13 could be added here, but for now just returning cleared
                    return cleaned;
                }
                return cleaned;
            case 'MPN':
                return cleaned.toUpperCase();
            default:
                return cleaned;
        }
    }

    /**
     * Normalizes brand names to a canonical form.
     */
    static normalizeBrand(brand: string): string {
        if (!brand) return '';
        // Basic normalization + specific canonical mappings can be added here
        const normalized = this.normalizeText(brand);

        // Example canonical mappings (this could be data-driven)
        const mappings: Record<string, string> = {
            'hp': 'hp',
            'hewlett packard': 'hp',
            'lg electronics': 'lg',
        };

        return mappings[normalized] || normalized;
    }

    /**
     * Normalizes model numbers/names.
     */
    static normalizeModel(model: string): string {
        if (!model) return '';
        // Remove version suffixes like "v1", "rev 2" if needed, or just standard text norm
        return this.normalizeText(model);
    }

    /**
     * Normalizes category IDs or names.
     */
    static normalizeCategory(categoryId: string): string {
        if (!categoryId) return '';
        return categoryId.trim();
    }
}
