/**
 * Payout Entity
 * Pure business entity representing a seller payout
 * Enforces payout business rules and validation
 */

export enum PayoutStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
}

export enum PayoutMethod {
    BANK_TRANSFER = 'BANK_TRANSFER',
    MOBILE_MONEY = 'MOBILE_MONEY',
    WALLET = 'WALLET',
}

export interface BankDetails {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    branchCode?: string;
    swiftCode?: string;
}

export interface MobileMoneyDetails {
    provider: string;
    phoneNumber: string;
    accountName: string;
}

export interface PayoutProps {
    id: string;
    userId: string;
    userRole: string;
    amount: number;
    currency: string;
    method: PayoutMethod;
    status: PayoutStatus;
    bankDetails?: BankDetails;
    mobileMoneyDetails?: MobileMoneyDetails;
    fee: number;
    netAmount: number;
    reference?: string;
    failureReason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
}

export class Payout {
    private props: PayoutProps;

    constructor(props: PayoutProps) {
        this.validateProps(props);
        this.props = { ...props };
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get userId(): string {
        return this.props.userId;
    }

    get userRole(): string {
        return this.props.userRole;
    }

    get amount(): number {
        return this.props.amount;
    }

    get currency(): string {
        return this.props.currency;
    }

    get method(): PayoutMethod {
        return this.props.method;
    }

    get status(): PayoutStatus {
        return this.props.status;
    }

    get bankDetails(): BankDetails | undefined {
        return this.props.bankDetails ? { ...this.props.bankDetails } : undefined;
    }

    get mobileMoneyDetails(): MobileMoneyDetails | undefined {
        return this.props.mobileMoneyDetails
            ? { ...this.props.mobileMoneyDetails }
            : undefined;
    }

    get fee(): number {
        return this.props.fee;
    }

    get netAmount(): number {
        return this.props.netAmount;
    }

    get reference(): string | undefined {
        return this.props.reference;
    }

    get failureReason(): string | undefined {
        return this.props.failureReason;
    }

    get metadata(): Record<string, any> | undefined {
        return this.props.metadata ? { ...this.props.metadata } : undefined;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    get processedAt(): Date | undefined {
        return this.props.processedAt;
    }

    get completedAt(): Date | undefined {
        return this.props.completedAt;
    }

    get failedAt(): Date | undefined {
        return this.props.failedAt;
    }

    // Business Methods

    /**
     * Validate payout details based on method
     */
    validate(): boolean {
        try {
            this.validateProps(this.props);
            this.validateMethodSpecificDetails();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Calculate payout fee based on method and amount
     */
    calculateFee(): number {
        const feePercentage = this.getFeePercentage();
        const calculatedFee = this.amount * feePercentage;

        // Apply minimum and maximum fee constraints
        const minFee = this.getMinimumFee();
        const maxFee = this.getMaximumFee();

        let fee = Math.max(calculatedFee, minFee);
        if (maxFee > 0) {
            fee = Math.min(fee, maxFee);
        }

        return Math.round(fee * 100) / 100;
    }

    /**
     * Get fee percentage based on payout method
     */
    private getFeePercentage(): number {
        switch (this.props.method) {
            case PayoutMethod.BANK_TRANSFER:
                return 0.01; // 1%
            case PayoutMethod.MOBILE_MONEY:
                return 0.015; // 1.5%
            case PayoutMethod.WALLET:
                return 0; // No fee for wallet
            default:
                return 0.02; // Default 2%
        }
    }

    /**
     * Get minimum fee based on method
     */
    private getMinimumFee(): number {
        switch (this.props.method) {
            case PayoutMethod.BANK_TRANSFER:
                return 500; // TZS 500 minimum
            case PayoutMethod.MOBILE_MONEY:
                return 300; // TZS 300 minimum
            case PayoutMethod.WALLET:
                return 0;
            default:
                return 500;
        }
    }

    /**
     * Get maximum fee based on method
     */
    private getMaximumFee(): number {
        switch (this.props.method) {
            case PayoutMethod.BANK_TRANSFER:
                return 10000; // TZS 10,000 maximum
            case PayoutMethod.MOBILE_MONEY:
                return 5000; // TZS 5,000 maximum
            case PayoutMethod.WALLET:
                return 0;
            default:
                return 10000;
        }
    }

    /**
     * Start processing the payout
     */
    process(): void {
        if (this.props.status !== PayoutStatus.PENDING) {
            throw new Error(`Cannot process payout in ${this.props.status} status`);
        }

        this.props.status = PayoutStatus.PROCESSING;
        this.props.processedAt = new Date();
        this.props.updatedAt = new Date();
    }

    /**
     * Mark payout as completed
     */
    complete(providerPayoutId?: string): void {
        if (this.props.status !== PayoutStatus.PROCESSING) {
            throw new Error(
                `Cannot complete payout in ${this.props.status} status. Must be PROCESSING.`
            );
        }

        this.props.status = PayoutStatus.COMPLETED;
        this.props.completedAt = new Date();
        this.props.updatedAt = new Date();

        if (providerPayoutId) {
            this.props.reference = providerPayoutId;
        }
    }

    /**
     * Mark payout as failed
     */
    fail(reason: string): void {
        if (
            this.props.status !== PayoutStatus.PENDING &&
            this.props.status !== PayoutStatus.PROCESSING
        ) {
            throw new Error(`Cannot fail payout in ${this.props.status} status`);
        }

        this.props.status = PayoutStatus.FAILED;
        this.props.failureReason = reason;
        this.props.updatedAt = new Date();
    }

    /**
     * Cancel payout
     */
    cancel(): void {
        if (this.props.status !== PayoutStatus.PENDING) {
            throw new Error(`Cannot cancel payout in ${this.props.status} status`);
        }

        this.props.status = PayoutStatus.CANCELLED;
        this.props.updatedAt = new Date();
    }

    /**
     * Validate method-specific details
     */
    private validateMethodSpecificDetails(): void {
        switch (this.props.method) {
            case PayoutMethod.BANK_TRANSFER:
                if (!this.props.bankDetails) {
                    throw new Error('Bank details required for bank transfer payout');
                }
                this.validateBankDetails(this.props.bankDetails);
                break;

            case PayoutMethod.MOBILE_MONEY:
                if (!this.props.mobileMoneyDetails) {
                    throw new Error('Mobile money details required for mobile money payout');
                }
                this.validateMobileMoneyDetails(this.props.mobileMoneyDetails);
                break;

            case PayoutMethod.WALLET:
                // No additional details required for wallet
                break;
        }
    }

    /**
     * Validate bank details
     */
    private validateBankDetails(details: BankDetails): void {
        if (!details.bankName || details.bankName.trim() === '') {
            throw new Error('Bank name is required');
        }

        if (!details.bankCode || details.bankCode.trim() === '') {
            throw new Error('Bank code is required');
        }

        if (!details.accountNumber || details.accountNumber.trim() === '') {
            throw new Error('Account number is required');
        }

        if (!details.accountName || details.accountName.trim() === '') {
            throw new Error('Account name is required');
        }

        // Validate account number format (basic validation)
        if (!/^\d{10,20}$/.test(details.accountNumber)) {
            throw new Error('Invalid account number format');
        }
    }

    /**
     * Validate mobile money details
     */
    private validateMobileMoneyDetails(details: MobileMoneyDetails): void {
        if (!details.provider || details.provider.trim() === '') {
            throw new Error('Mobile money provider is required');
        }

        if (!details.phoneNumber || details.phoneNumber.trim() === '') {
            throw new Error('Phone number is required');
        }

        if (!details.accountName || details.accountName.trim() === '') {
            throw new Error('Account name is required');
        }

        // Validate Tanzanian phone number format
        const phoneRegex = /^(\+255|255|0)[67][0-9]{8}$/;
        if (!phoneRegex.test(details.phoneNumber)) {
            throw new Error('Invalid Tanzanian phone number format');
        }
    }

    /**
     * Validate payout props
     */
    private validateProps(props: PayoutProps): void {
        if (!props.id || props.id.trim() === '') {
            throw new Error('Payout ID is required');
        }

        if (!props.userId || props.userId.trim() === '') {
            throw new Error('User ID is required');
        }

        if (!props.userRole || props.userRole.trim() === '') {
            throw new Error('User role is required');
        }

        if (props.userRole.toLowerCase() === 'buyer') {
            throw new Error('Buyers are not eligible for payouts');
        }

        if (props.amount <= 0) {
            throw new Error('Payout amount must be positive');
        }

        if (!props.currency || props.currency.trim() === '') {
            throw new Error('Currency is required');
        }

        if (!Object.values(PayoutMethod).includes(props.method)) {
            throw new Error(`Invalid payout method: ${props.method}`);
        }

        if (!Object.values(PayoutStatus).includes(props.status)) {
            throw new Error(`Invalid payout status: ${props.status}`);
        }

        if (props.fee < 0) {
            throw new Error('Payout fee cannot be negative');
        }

        if (props.netAmount <= 0) {
            throw new Error('Net payout amount must be positive');
        }

        // Validate that netAmount = amount - fee
        const expectedNetAmount = props.amount - props.fee;
        if (Math.abs(props.netAmount - expectedNetAmount) > 0.01) {
            throw new Error(
                `Invalid net amount. Expected ${expectedNetAmount}, got ${props.netAmount}`
            );
        }
    }

    /**
     * Create a snapshot of the payout
     */
    toObject(): PayoutProps {
        return { ...this.props };
    }
}
