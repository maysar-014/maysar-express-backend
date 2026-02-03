/**
 * PhoneNumber Value Object
 * Immutable value object representing a phone number
 * Validates Tanzanian phone number formats
 */

export class PhoneNumber {
    private readonly _countryCode: string;
    private readonly _number: string;
    private readonly _formatted: string;

    constructor(phoneNumber: string) {
        const parsed = this.parsePhoneNumber(phoneNumber);
        this._countryCode = parsed.countryCode;
        this._number = parsed.number;
        this._formatted = this.formatPhoneNumber(parsed.countryCode, parsed.number);
    }

    get countryCode(): string {
        return this._countryCode;
    }

    get number(): string {
        return this._number;
    }

    get formatted(): string {
        return this._formatted;
    }

    /**
     * Get international format (+255...)
     */
    getInternational(): string {
        return `+${this._countryCode}${this._number}`;
    }

    /**
     * Get local format (0...)
     */
    getLocal(): string {
        return `0${this._number}`;
    }

    /**
     * Get E.164 format
     */
    getE164(): string {
        return `+${this._countryCode}${this._number}`;
    }

    /**
     * Validate if this is a valid Tanzanian phone number
     */
    isValidTanzanian(): boolean {
        return this._countryCode === '255' && this.isValidTanzanianNumber(this._number);
    }

    /**
     * Get mobile network operator
     */
    getOperator(): string | null {
        if (!this.isValidTanzanian()) {
            return null;
        }

        const firstDigit = this._number.charAt(0);
        const secondDigit = this._number.charAt(1);

        // Vodacom (M-PESA)
        if (firstDigit === '7' && ['4', '5', '6'].includes(secondDigit)) {
            return 'VODACOM';
        }

        // Airtel
        if (firstDigit === '7' && ['8', '9'].includes(secondDigit)) {
            return 'AIRTEL';
        }
        if (firstDigit === '6' && ['8', '9'].includes(secondDigit)) {
            return 'AIRTEL';
        }

        // Tigo
        if (firstDigit === '7' && ['1', '2', '3'].includes(secondDigit)) {
            return 'TIGO';
        }
        if (firstDigit === '6' && ['5', '6', '7'].includes(secondDigit)) {
            return 'TIGO';
        }

        // Halotel
        if (firstDigit === '6' && ['2', '3'].includes(secondDigit)) {
            return 'HALOTEL';
        }

        return 'UNKNOWN';
    }

    /**
     * Check if phone number supports mobile money
     */
    supportsMobileMoney(): boolean {
        const operator = this.getOperator();
        return operator !== null && operator !== 'UNKNOWN';
    }

    /**
     * Validate phone number format
     */
    validate(): boolean {
        try {
            this.parsePhoneNumber(this.getInternational());
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check equality with another phone number
     */
    equals(other: PhoneNumber): boolean {
        if (!(other instanceof PhoneNumber)) {
            return false;
        }
        return (
            this._countryCode === other._countryCode && this._number === other._number
        );
    }

    /**
     * Convert to plain object
     */
    toObject(): {
        countryCode: string;
        number: string;
        formatted: string;
    } {
        return {
            countryCode: this._countryCode,
            number: this._number,
            formatted: this._formatted,
        };
    }

    /**
     * Parse phone number from various formats
     */
    private parsePhoneNumber(phoneNumber: string): {
        countryCode: string;
        number: string;
    } {
        if (!phoneNumber || phoneNumber.trim() === '') {
            throw new Error('Phone number is required');
        }

        // Remove all non-digit characters except leading +
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');

        // Pattern 1: +255XXXXXXXXX (international format)
        if (cleaned.startsWith('+255')) {
            const number = cleaned.substring(4);
            if (this.isValidTanzanianNumber(number)) {
                return { countryCode: '255', number };
            }
        }

        // Pattern 2: 255XXXXXXXXX (without +)
        if (cleaned.startsWith('255')) {
            const number = cleaned.substring(3);
            if (this.isValidTanzanianNumber(number)) {
                return { countryCode: '255', number };
            }
        }

        // Pattern 3: 0XXXXXXXXX (local format)
        if (cleaned.startsWith('0')) {
            const number = cleaned.substring(1);
            if (this.isValidTanzanianNumber(number)) {
                return { countryCode: '255', number };
            }
        }

        // Pattern 4: XXXXXXXXX (9 digits)
        if (cleaned.length === 9 && this.isValidTanzanianNumber(cleaned)) {
            return { countryCode: '255', number: cleaned };
        }

        throw new Error(`Invalid Tanzanian phone number format: ${phoneNumber}`);
    }

    /**
     * Validate Tanzanian phone number (9 digits starting with 6 or 7)
     */
    private isValidTanzanianNumber(number: string): boolean {
        // Must be exactly 9 digits
        if (!/^\d{9}$/.test(number)) {
            return false;
        }

        // Must start with 6 or 7
        const firstDigit = number.charAt(0);
        if (firstDigit !== '6' && firstDigit !== '7') {
            return false;
        }

        return true;
    }

    /**
     * Format phone number for display
     */
    private formatPhoneNumber(countryCode: string, number: string): string {
        // Format as +255 XXX XXX XXX
        if (number.length === 9) {
            return `+${countryCode} ${number.substring(0, 3)} ${number.substring(
                3,
                6
            )} ${number.substring(6)}`;
        }

        return `+${countryCode}${number}`;
    }

    /**
     * Create PhoneNumber from international format
     */
    static fromInternational(phoneNumber: string): PhoneNumber {
        return new PhoneNumber(phoneNumber);
    }

    /**
     * Create PhoneNumber from local format
     */
    static fromLocal(phoneNumber: string): PhoneNumber {
        return new PhoneNumber(phoneNumber);
    }
}
