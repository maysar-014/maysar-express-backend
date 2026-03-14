/**
 * PaymentMethod Value Object
 * Immutable value object representing a payment method
 * Validates method-specific requirements
 */

export enum PaymentMethodType {
    MPESA = 'MPESA',
    AIRTEL_MONEY = 'AIRTEL_MONEY',
    TIGO_PESA = 'TIGO_PESA',
    HALOPESA = 'HALOPESA',
    WALLET = 'WALLET',
    BANK_TRANSFER = 'BANK_TRANSFER',
    CARD = 'CARD',
}

export enum PaymentProvider {
    PESAPAL = 'PESAPAL',
    INTERNAL_WALLET = 'INTERNAL_WALLET',
}

export interface PaymentMethodMetadata {
    displayName?: string;
    icon?: string;
    description?: string;
    [key: string]: any;
}

export class PaymentMethod {
    private readonly _type: PaymentMethodType;
    private readonly _provider: PaymentProvider;
    private readonly _metadata: PaymentMethodMetadata;

    constructor(
        type: PaymentMethodType,
        provider: PaymentProvider,
        metadata: PaymentMethodMetadata = {}
    ) {
        this.validateType(type);
        this.validateProvider(provider);
        this.validateProviderCompatibility(type, provider);

        this._type = type;
        this._provider = provider;
        this._metadata = { ...metadata };
    }

    get type(): PaymentMethodType {
        return this._type;
    }

    get provider(): PaymentProvider {
        return this._provider;
    }

    get metadata(): PaymentMethodMetadata {
        return { ...this._metadata };
    }

    /**
     * Check if payment method requires phone number
     */
    requiresPhoneNumber(): boolean {
        const mobileMoneyMethods = [
            PaymentMethodType.MPESA,
            PaymentMethodType.AIRTEL_MONEY,
            PaymentMethodType.TIGO_PESA,
            PaymentMethodType.HALOPESA,
        ];

        return mobileMoneyMethods.includes(this._type);
    }

    /**
     * Check if payment method requires bank account
     */
    requiresBankAccount(): boolean {
        return this._type === PaymentMethodType.BANK_TRANSFER;
    }

    /**
     * Check if payment method requires card details
     */
    requiresCardDetails(): boolean {
        return this._type === PaymentMethodType.CARD;
    }

    /**
     * Check if payment method supports given currency
     */
    supportsCurrency(currency: string): boolean {
        const currencyUpper = currency.toUpperCase();

        // Mobile money methods primarily support TZS
        if (this.requiresPhoneNumber()) {
            return currencyUpper === 'TZS';
        }

        // Wallet supports all currencies
        if (this._type === PaymentMethodType.WALLET) {
            return ['TZS', 'USD', 'EUR', 'GBP', 'KES', 'UGX'].includes(currencyUpper);
        }

        // Bank transfer and card support multiple currencies
        if (
            this._type === PaymentMethodType.BANK_TRANSFER ||
            this._type === PaymentMethodType.CARD
        ) {
            return ['TZS', 'USD', 'EUR', 'GBP'].includes(currencyUpper);
        }

        return false;
    }

    /**
     * Get minimum transaction amount for this payment method
     */
    getMinimumAmount(currency: string = 'TZS'): number {
        const currencyUpper = currency.toUpperCase();

        if (currencyUpper === 'TZS') {
            switch (this._type) {
                case PaymentMethodType.MPESA:
                case PaymentMethodType.AIRTEL_MONEY:
                case PaymentMethodType.TIGO_PESA:
                case PaymentMethodType.HALOPESA:
                    return 500; // TZS 500 minimum for mobile money
                case PaymentMethodType.WALLET:
                    return 100; // TZS 100 minimum for wallet
                case PaymentMethodType.BANK_TRANSFER:
                    return 1000; // TZS 1,000 minimum for bank transfer
                case PaymentMethodType.CARD:
                    return 1000; // TZS 1,000 minimum for card
                default:
                    return 500;
            }
        }

        // USD minimums
        if (currencyUpper === 'USD') {
            return 1; // $1 minimum for all methods
        }

        return 0;
    }

    /**
     * Get maximum transaction amount for this payment method
     */
    getMaximumAmount(currency: string = 'TZS'): number {
        const currencyUpper = currency.toUpperCase();

        if (currencyUpper === 'TZS') {
            switch (this._type) {
                case PaymentMethodType.MPESA:
                case PaymentMethodType.AIRTEL_MONEY:
                case PaymentMethodType.TIGO_PESA:
                case PaymentMethodType.HALOPESA:
                    return 5000000; // TZS 5,000,000 maximum for mobile money
                case PaymentMethodType.WALLET:
                    return 10000000; // TZS 10,000,000 maximum for wallet
                case PaymentMethodType.BANK_TRANSFER:
                    return 50000000; // TZS 50,000,000 maximum for bank transfer
                case PaymentMethodType.CARD:
                    return 20000000; // TZS 20,000,000 maximum for card
                default:
                    return 5000000;
            }
        }

        // USD maximums
        if (currencyUpper === 'USD') {
            return 10000; // $10,000 maximum
        }

        return 0;
    }

    /**
     * Validate payment amount for this method
     */
    validate(amount: number, currency: string): void {
        if (!this.supportsCurrency(currency)) {
            throw new Error(
                `Payment method ${this._type} does not support currency ${currency}`
            );
        }

        const minAmount = this.getMinimumAmount(currency);
        const maxAmount = this.getMaximumAmount(currency);

        if (amount < minAmount) {
            throw new Error(
                `Amount ${amount} ${currency} is below minimum ${minAmount} for ${this._type}`
            );
        }

        if (amount > maxAmount) {
            throw new Error(
                `Amount ${amount} ${currency} exceeds maximum ${maxAmount} for ${this._type}`
            );
        }
    }

    /**
     * Get display name for payment method
     */
    getDisplayName(): string {
        if (this._metadata.displayName) {
            return this._metadata.displayName;
        }

        switch (this._type) {
            case PaymentMethodType.MPESA:
                return 'M-PESA';
            case PaymentMethodType.AIRTEL_MONEY:
                return 'Airtel Money';
            case PaymentMethodType.TIGO_PESA:
                return 'Tigo Pesa';
            case PaymentMethodType.HALOPESA:
                return 'HaloPesa';
            case PaymentMethodType.WALLET:
                return 'Wallet';
            case PaymentMethodType.BANK_TRANSFER:
                return 'Bank Transfer';
            case PaymentMethodType.CARD:
                return 'Credit/Debit Card';
            default:
                return this._type;
        }
    }

    /**
     * Check equality with another payment method
     */
    equals(other: PaymentMethod): boolean {
        if (!(other instanceof PaymentMethod)) {
            return false;
        }
        return this._type === other._type && this._provider === other._provider;
    }

    /**
     * Convert to plain object
     */
    toObject(): {
        type: PaymentMethodType;
        provider: PaymentProvider;
        metadata: PaymentMethodMetadata;
    } {
        return {
            type: this._type,
            provider: this._provider,
            metadata: { ...this._metadata },
        };
    }

    /**
     * Validate payment method type
     */
    private validateType(type: PaymentMethodType): void {
        if (!Object.values(PaymentMethodType).includes(type)) {
            throw new Error(`Invalid payment method type: ${type}`);
        }
    }

    /**
     * Validate payment provider
     */
    private validateProvider(provider: PaymentProvider): void {
        if (!Object.values(PaymentProvider).includes(provider)) {
            throw new Error(`Invalid payment provider: ${provider}`);
        }
    }

    /**
     * Validate provider compatibility with payment method
     */
    private validateProviderCompatibility(
        type: PaymentMethodType,
        provider: PaymentProvider
    ): void {
        // Wallet must use internal wallet provider
        if (type === PaymentMethodType.WALLET && provider !== PaymentProvider.INTERNAL_WALLET) {
            throw new Error('Wallet payment method must use INTERNAL_WALLET provider');
        }

        // Mobile money and other methods use Pesapal
        const pesapalMethods = [
            PaymentMethodType.MPESA,
            PaymentMethodType.AIRTEL_MONEY,
            PaymentMethodType.TIGO_PESA,
            PaymentMethodType.HALOPESA,
            PaymentMethodType.BANK_TRANSFER,
            PaymentMethodType.CARD,
        ];

        if (pesapalMethods.includes(type) && provider !== PaymentProvider.PESAPAL) {
            throw new Error(`Payment method ${type} must use PESAPAL provider`);
        }
    }

    /**
     * Create PaymentMethod from string
     */
    static fromString(
        typeString: string,
        providerString: string = 'PESAPAL'
    ): PaymentMethod {
        const type = typeString.toUpperCase() as PaymentMethodType;
        const provider = providerString.toUpperCase() as PaymentProvider;

        return new PaymentMethod(type, provider);
    }
}

