/**
 * Money Value Object
 * Immutable value object representing monetary amounts
 * Ensures precision and currency consistency
 */

export class Money {
    private readonly _amount: number;
    private readonly _currency: string;

    constructor(amount: number, currency: string) {
        this.validateAmount(amount);
        this.validateCurrency(currency);

        // Store amount with 2 decimal precision
        this._amount = Math.round(amount * 100) / 100;
        this._currency = currency.toUpperCase();
    }

    get amount(): number {
        return this._amount;
    }

    get currency(): string {
        return this._currency;
    }

    /**
     * Add two money values
     */
    add(other: Money): Money {
        this.ensureSameCurrency(other);
        return new Money(this._amount + other._amount, this._currency);
    }

    /**
     * Subtract two money values
     */
    subtract(other: Money): Money {
        this.ensureSameCurrency(other);
        return new Money(this._amount - other._amount, this._currency);
    }

    /**
     * Multiply money by a scalar
     */
    multiply(multiplier: number): Money {
        if (!Number.isFinite(multiplier)) {
            throw new Error('Multiplier must be a finite number');
        }
        return new Money(this._amount * multiplier, this._currency);
    }

    /**
     * Divide money by a scalar
     */
    divide(divisor: number): Money {
        if (divisor === 0) {
            throw new Error('Cannot divide by zero');
        }
        if (!Number.isFinite(divisor)) {
            throw new Error('Divisor must be a finite number');
        }
        return new Money(this._amount / divisor, this._currency);
    }

    /**
     * Check if amount is positive
     */
    isPositive(): boolean {
        return this._amount > 0;
    }

    /**
     * Check if amount is negative
     */
    isNegative(): boolean {
        return this._amount < 0;
    }

    /**
     * Check if amount is zero
     */
    isZero(): boolean {
        return Math.abs(this._amount) < 0.01;
    }

    /**
     * Check if this money is greater than another
     */
    isGreaterThan(other: Money): boolean {
        this.ensureSameCurrency(other);
        return this._amount > other._amount;
    }

    /**
     * Check if this money is less than another
     */
    isLessThan(other: Money): boolean {
        this.ensureSameCurrency(other);
        return this._amount < other._amount;
    }

    /**
     * Check equality with another money value
     */
    equals(other: Money): boolean {
        if (!(other instanceof Money)) {
            return false;
        }
        return (
            this._currency === other._currency &&
            Math.abs(this._amount - other._amount) < 0.01
        );
    }

    /**
     * Get absolute value
     */
    abs(): Money {
        return new Money(Math.abs(this._amount), this._currency);
    }

    /**
     * Allocate money proportionally
     */
    allocate(ratios: number[]): Money[] {
        if (ratios.length === 0) {
            throw new Error('At least one ratio is required');
        }

        const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
        if (totalRatio === 0) {
            throw new Error('Total ratio cannot be zero');
        }

        const results: Money[] = [];
        let remainder = this._amount;

        for (let i = 0; i < ratios.length; i++) {
            const share = Math.floor((this._amount * ratios[i]) / totalRatio * 100) / 100;
            results.push(new Money(share, this._currency));
            remainder -= share;
        }

        // Add remainder to the last allocation to handle rounding
        if (remainder !== 0 && results.length > 0) {
            const lastIndex = results.length - 1;
            results[lastIndex] = new Money(
                results[lastIndex]._amount + remainder,
                this._currency
            );
        }

        return results;
    }

    /**
     * Format money for display
     */
    format(): string {
        return `${this._currency} ${this._amount.toFixed(2)}`;
    }

    /**
     * Convert to plain object
     */
    toObject(): { amount: number; currency: string } {
        return {
            amount: this._amount,
            currency: this._currency,
        };
    }

    /**
     * Ensure same currency for operations
     */
    private ensureSameCurrency(other: Money): void {
        if (this._currency !== other._currency) {
            throw new Error(
                `Currency mismatch: ${this._currency} vs ${other._currency}`
            );
        }
    }

    /**
     * Validate amount
     */
    private validateAmount(amount: number): void {
        if (!Number.isFinite(amount)) {
            throw new Error('Amount must be a finite number');
        }
    }

    /**
     * Validate currency code (ISO 4217)
     */
    private validateCurrency(currency: string): void {
        if (!currency || currency.trim() === '') {
            throw new Error('Currency is required');
        }

        const currencyUpper = currency.toUpperCase();

        // List of supported currencies (ISO 4217)
        const supportedCurrencies = [
            'TZS', // Tanzanian Shilling
            'USD', // US Dollar
            'EUR', // Euro
            'GBP', // British Pound
            'KES', // Kenyan Shilling
            'UGX', // Ugandan Shilling
        ];

        if (!supportedCurrencies.includes(currencyUpper)) {
            throw new Error(`Unsupported currency: ${currency}`);
        }

        if (currencyUpper.length !== 3) {
            throw new Error('Currency code must be 3 characters');
        }
    }

    /**
     * Create Money from cents/minor units
     */
    static fromMinorUnits(minorUnits: number, currency: string): Money {
        return new Money(minorUnits / 100, currency);
    }

    /**
     * Get amount in minor units (cents)
     */
    toMinorUnits(): number {
        return Math.round(this._amount * 100);
    }
}
