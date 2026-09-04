
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

    // ── Attribute Value Normalization ──────────────────────────────────────────

    /**
     * Normalizes a storage/memory value to canonical form.
     * Examples: "256 GB" → "256GB", "256gb" → "256GB", "1 TB" → "1TB"
     */
    static normalizeStorage(value: string): string {
        if (!value) return value;
        return value
            .trim()
            .replace(/\s+/g, '')
            .replace(/gb/i, 'GB')
            .replace(/tb/i, 'TB')
            .replace(/mb/i, 'MB');
    }

    /**
     * Normalizes a weight value to canonical form.
     * Examples: "1.5 Kg" → "1.5kg", "500 g" → "500g", "2 kgs" → "2kg"
     */
    static normalizeWeight(value: string): string {
        if (!value) return value;
        return value
            .trim()
            .replace(/\s+/g, '')
            .replace(/kgs?/i, 'kg')
            .replace(/grams?/i, 'g')
            .replace(/(?<!\k)kg/i, 'kg')
            .toLowerCase();
    }

    /**
     * Normalizes a duration/warranty value to canonical form.
     * Examples: "2 yrs" → "2 years", "Two years" → "2 years", "12 months" → "12 months"
     */
    static normalizeDuration(value: string): string {
        if (!value) return value;
        const lower = value.trim().toLowerCase();

        // Word-to-number mappings for common values
        const wordNumbers: Record<string, string> = {
            'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
            'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        };

        let normalized = lower;
        for (const [word, num] of Object.entries(wordNumbers)) {
            normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
        }

        // Normalize unit synonyms
        normalized = normalized
            .replace(/\byrs?\b/g, 'years')
            .replace(/\bmnths?\b/g, 'months')
            .replace(/\bmos?\b/g, 'months')
            .replace(/\bdays?\b/g, 'days')
            .replace(/\s+/g, ' ')
            .trim();

        return normalized;
    }

    /**
     * Normalizes a display size value.
     * Examples: "6.6 Inch" → "6.6 inch", "6.6\"" → "6.6 inch"
     */
    static normalizeDisplaySize(value: string): string {
        if (!value) return value;
        return value
            .trim()
            .replace(/"/g, ' inch')
            .replace(/\binches\b/i, 'inch')
            .replace(/\s+/g, ' ')
            .toLowerCase()
            .trim();
    }

    /**
     * Normalizes a capacity/volume value.
     * Examples: "5 L" → "5L", "500 ml" → "500ml", "500ML" → "500ml"
     */
    static normalizeVolume(value: string): string {
        if (!value) return value;
        return value
            .trim()
            .replace(/\s+/g, '')
            .replace(/litres?/i, 'L')
            .replace(/\bml\b/i, 'ml')
            .replace(/\bl\b(?!i)/i, 'L');
    }

    /**
     * Normalizes a generic attribute value: trims whitespace, collapses internal
     * spaces, and title-cases single-word enum values.
     */
    static normalizeAttributeValue(value: string): string {
        if (!value) return value;
        return value.trim().replace(/\s+/g, ' ');
    }

    /**
     * Infers and applies the correct normalization based on a known attribute key.
     * Falls back to generic normalization for unknown keys.
     */
    static normalizeByAttributeKey(key: string, value: string): string {
        if (!value) return value;
        const k = key.toLowerCase().replace(/[\s-]/g, '_');

        if (['storage', 'internal_memory', 'rom', 'built_in_storage', 'ram', 'memory'].includes(k)) {
            return this.normalizeStorage(value);
        }
        if (['weight', 'net_weight', 'gross_weight'].includes(k)) {
            return this.normalizeWeight(value);
        }
        if (['warranty', 'warranty_period', 'guarantee'].includes(k)) {
            return this.normalizeDuration(value);
        }
        if (['display', 'screen_size', 'display_size', 'screen'].includes(k)) {
            return this.normalizeDisplaySize(value);
        }
        if (['volume', 'net_volume', 'capacity'].includes(k)) {
            return this.normalizeVolume(value);
        }
        return this.normalizeAttributeValue(value);
    }
}
