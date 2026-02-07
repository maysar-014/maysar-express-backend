/**
 * Phone Number Value Object
 * Validates and formats phone numbers in E.164 format
 */

export class PhoneNumber {
    private readonly value: string;
    private readonly countryCode: string;

    private constructor(phoneNumber: string) {
        this.value = phoneNumber;
        this.countryCode = this.extractCountryCode(phoneNumber);
    }

    static create(phoneNumber: string): PhoneNumber {
        const normalized = this.normalize(phoneNumber);
        this.validate(normalized);
        return new PhoneNumber(normalized);
    }

    private static normalize(phoneNumber: string): string {
        // Remove all non-digit characters except leading +
        let normalized = phoneNumber.trim().replace(/[^\d+]/g, '');

        // Ensure it starts with +
        if (!normalized.startsWith('+')) {
            normalized = '+' + normalized;
        }

        return normalized;
    }

    private static validate(phoneNumber: string): void {
        // E.164 format: +[country code][number]
        // Length: 8-15 digits (including country code)
        const e164Regex = /^\+[1-9]\d{7,14}$/;

        if (!e164Regex.test(phoneNumber)) {
            throw new Error(
                `Invalid phone number format: ${phoneNumber}. Must be in E.164 format (e.g., +255712345678)`
            );
        }
    }

    private extractCountryCode(phoneNumber: string): string {
        // Extract country code (1-3 digits after +)
        const match = phoneNumber.match(/^\+(\d{1,3})/);
        return match ? match[1] : '';
    }

    getValue(): string {
        return this.value;
    }

    getCountryCode(): string {
        return this.countryCode;
    }

    getLocalNumber(): string {
        return this.value.substring(this.countryCode.length + 1);
    }

    equals(other: PhoneNumber): boolean {
        return this.value === other.value;
    }

    toString(): string {
        return this.value;
    }

    /**
     * Format for display (e.g., +255 712 345 678)
     */
    toDisplayFormat(): string {
        const local = this.getLocalNumber();
        const formatted = local.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        return `+${this.countryCode} ${formatted}`;
    }

    /**
     * Check if number is from Tanzania
     */
    isTanzanian(): boolean {
        return this.countryCode === '255';
    }

    /**
     * Check if number is mobile (basic heuristic)
     */
    isMobile(): boolean {
        // Tanzania mobile prefixes: 71, 72, 73, 74, 75, 76, 77, 78, 79
        if (this.isTanzanian()) {
            const local = this.getLocalNumber();
            return /^7[1-9]/.test(local);
        }
        // For other countries, assume mobile if length > 10
        return this.getLocalNumber().length >= 9;
    }
}
