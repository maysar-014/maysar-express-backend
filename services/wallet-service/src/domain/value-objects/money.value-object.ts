export interface MoneyProps {
    amount: number; // Integer minor units (e.g., cents)
    currency: string; // ISO 4217 code (e.g., 'TZS', 'USD')
}

export class Money {
    private constructor(private readonly props: MoneyProps) {
        if (!Number.isInteger(props.amount)) {
            throw new Error('Money amount must be an integer (minor units)');
        }
    }

    public static fromMinor(amount: number, currency: string): Money {
        return new Money({ amount, currency });
    }

    public static fromMajor(amount: number, currency: string): Money {
        // Simple conversion, assuming 2 decimal places for now. 
        // In a real strict system, we'd lookup currency precision.
        // For TZS it's usually 0 or 2 depending on context, using 2 for safety/standardization or 0.
        // Let's assume standard 100 factor for now.
        return new Money({ amount: Math.round(amount * 100), currency });
    }

    public static zero(currency: string): Money {
        return new Money({ amount: 0, currency });
    }

    get amount(): number {
        return this.props.amount;
    }

    get currency(): string {
        return this.props.currency;
    }

    public add(other: Money): Money {
        this.assertSameCurrency(other);
        return new Money({ amount: this.props.amount + other.props.amount, currency: this.props.currency });
    }

    public subtract(other: Money): Money {
        this.assertSameCurrency(other);
        return new Money({ amount: this.props.amount - other.props.amount, currency: this.props.currency });
    }

    public multiply(factor: number): Money {
        return new Money({ amount: Math.round(this.props.amount * factor), currency: this.props.currency });
    }

    public isGreaterThan(other: Money): boolean {
        this.assertSameCurrency(other);
        return this.props.amount > other.props.amount;
    }

    public isLessThan(other: Money): boolean {
        this.assertSameCurrency(other);
        return this.props.amount < other.props.amount;
    }

    public isGreaterThanOrEqual(other: Money): boolean {
        this.assertSameCurrency(other);
        return this.props.amount >= other.props.amount;
    }

    public equals(other: Money): boolean {
        return this.props.amount === other.props.amount && this.props.currency === other.props.currency;
    }

    public toMajor(): number {
        return this.props.amount / 100;
    }

    private assertSameCurrency(other: Money): void {
        if (this.props.currency !== other.props.currency) {
            throw new Error(`Currency mismatch: cannot operate on ${this.props.currency} and ${other.props.currency}`);
        }
    }
}
