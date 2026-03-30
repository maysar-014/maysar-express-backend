export class Money {
    constructor(
        public readonly amount: number,
        public readonly currency: string
    ) {
        if (!Number.isFinite(amount)) throw new Error('Amount must be a finite number');
        if (!currency || currency.trim().length === 0) throw new Error('Currency is required');
    }

    static create(amount: number, currency: string): Money {
        return new Money(amount, currency);
    }

    getAmount(): number {
        return this.amount;
    }

    getCurrency(): string {
        return this.currency;
    }

    add(other: Money): Money {
        if (this.currency !== other.currency) throw new Error('Currencies must match');
        return new Money(this.amount + other.amount, this.currency);
    }

    multiply(factor: number): Money {
        return new Money(this.amount * factor, this.currency);
    }
}
