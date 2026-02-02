/**
 * BankAccount Value Object
 * Immutable value object representing a bank account
 * Validates bank account details
 */

export enum AccountType {
    SAVINGS = 'SAVINGS',
    CURRENT = 'CURRENT',
    BUSINESS = 'BUSINESS',
}

export class BankAccount {
    private readonly _accountNumber: string;
    private readonly _bankCode: string;
    private readonly _accountType: AccountType;
    private readonly _accountName?: string;
    private readonly _branchCode?: string;
    private readonly _swiftCode?: string;

    constructor(
        accountNumber: string,
        bankCode: string,
        accountType: AccountType,
        accountName?: string,
        branchCode?: string,
        swiftCode?: string
    ) {
        this.validateAccountNumber(accountNumber);
        this.validateBankCode(bankCode);
        this.validateAccountType(accountType);

        this._accountNumber = accountNumber.trim();
        this._bankCode = bankCode.trim().toUpperCase();
        this._accountType = accountType;
        this._accountName = accountName?.trim();
        this._branchCode = branchCode?.trim();
        this._swiftCode = swiftCode?.trim().toUpperCase();
    }

    get accountNumber(): string {
        return this._accountNumber;
    }

    get bankCode(): string {
        return this._bankCode;
    }

    get accountType(): AccountType {
        return this._accountType;
    }

    get accountName(): string | undefined {
        return this._accountName;
    }

    get branchCode(): string | undefined {
        return this._branchCode;
    }

    get swiftCode(): string | undefined {
        return this._swiftCode;
    }

    /**
     * Mask account number for display (show last 4 digits)
     */
    mask(): string {
        if (this._accountNumber.length <= 4) {
            return '****';
        }

        const visibleDigits = this._accountNumber.slice(-4);
        const maskedLength = this._accountNumber.length - 4;
        return '*'.repeat(maskedLength) + visibleDigits;
    }

    /**
     * Get bank name from bank code
     */
    getBankName(): string {
        const bankNames: Record<string, string> = {
            'NMB': 'NMB Bank',
            'CRDB': 'CRDB Bank',
            'NBC': 'National Bank of Commerce',
            'EXIM': 'Exim Bank',
            'DTB': 'Diamond Trust Bank',
            'SCB': 'Standard Chartered Bank',
            'STANBIC': 'Stanbic Bank',
            'BOA': 'Bank of Africa',
            'BOT': 'Bank of Tanzania',
            'ABSA': 'ABSA Bank',
            'EQUITY': 'Equity Bank',
            'KCB': 'Kenya Commercial Bank',
            'I&M': 'I&M Bank',
        };

        return bankNames[this._bankCode] || this._bankCode;
    }

    /**
     * Validate bank account
     */
    isValid(): boolean {
        try {
            this.validateAccountNumber(this._accountNumber);
            this.validateBankCode(this._bankCode);
            this.validateAccountType(this._accountType);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if account supports international transfers
     */
    supportsInternationalTransfers(): boolean {
        return this._swiftCode !== undefined && this._swiftCode.length > 0;
    }

    /**
     * Check equality with another bank account
     */
    equals(other: BankAccount): boolean {
        if (!(other instanceof BankAccount)) {
            return false;
        }
        return (
            this._accountNumber === other._accountNumber &&
            this._bankCode === other._bankCode
        );
    }

    /**
     * Convert to plain object
     */
    toObject(): {
        accountNumber: string;
        bankCode: string;
        accountType: AccountType;
        accountName?: string;
        branchCode?: string;
        swiftCode?: string;
    } {
        return {
            accountNumber: this._accountNumber,
            bankCode: this._bankCode,
            accountType: this._accountType,
            accountName: this._accountName,
            branchCode: this._branchCode,
            swiftCode: this._swiftCode,
        };
    }

    /**
     * Validate account number format
     */
    private validateAccountNumber(accountNumber: string): void {
        if (!accountNumber || accountNumber.trim() === '') {
            throw new Error('Account number is required');
        }

        const cleaned = accountNumber.trim();

        // Account number should be 10-20 digits
        if (!/^\d{10,20}$/.test(cleaned)) {
            throw new Error(
                'Account number must be between 10 and 20 digits'
            );
        }
    }

    /**
     * Validate bank code
     */
    private validateBankCode(bankCode: string): void {
        if (!bankCode || bankCode.trim() === '') {
            throw new Error('Bank code is required');
        }

        const cleaned = bankCode.trim();

        // Bank code should be 2-10 alphanumeric characters
        if (!/^[A-Z0-9]{2,10}$/i.test(cleaned)) {
            throw new Error(
                'Bank code must be 2-10 alphanumeric characters'
            );
        }
    }

    /**
     * Validate account type
     */
    private validateAccountType(accountType: AccountType): void {
        if (!Object.values(AccountType).includes(accountType)) {
            throw new Error(`Invalid account type: ${accountType}`);
        }
    }

    /**
     * Create BankAccount from object
     */
    static fromObject(obj: {
        accountNumber: string;
        bankCode: string;
        accountType: AccountType;
        accountName?: string;
        branchCode?: string;
        swiftCode?: string;
    }): BankAccount {
        return new BankAccount(
            obj.accountNumber,
            obj.bankCode,
            obj.accountType,
            obj.accountName,
            obj.branchCode,
            obj.swiftCode
        );
    }
}
