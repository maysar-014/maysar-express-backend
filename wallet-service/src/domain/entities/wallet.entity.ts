/**
 * Wallet Entity
 * Pure business entity representing a user's wallet
 * Enforces balance constraints and frozen amount handling
 */

export enum WalletStatus {
    ACTIVE = 'ACTIVE',
    FROZEN = 'FROZEN',
    SUSPENDED = 'SUSPENDED',
    CLOSED = 'CLOSED',
}

export interface WalletProps {
    id: string;
    userId: string;
    balance: number;
    currency: string;
    status: WalletStatus;
    frozenAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

export class Wallet {
    private props: WalletProps;

    constructor(props: WalletProps) {
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

    get balance(): number {
        return this.props.balance;
    }

    get currency(): string {
        return this.props.currency;
    }

    get status(): WalletStatus {
        return this.props.status;
    }

    get frozenAmount(): number {
        return this.props.frozenAmount;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    // Business Methods

    /**
     * Get available balance (balance - frozen amount)
     */
    getAvailableBalance(): number {
        return this.balance - this.frozenAmount;
    }

    /**
     * Check if wallet can debit specified amount
     */
    canDebit(amount: number): boolean {
        if (this.props.status !== WalletStatus.ACTIVE) {
            return false;
        }

        if (amount <= 0) {
            return false;
        }

        return this.getAvailableBalance() >= amount;
    }

    /**
     * Credit wallet with specified amount
     */
    credit(amount: number): void {
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }

        if (this.props.status === WalletStatus.CLOSED) {
            throw new Error('Cannot credit a closed wallet');
        }

        this.props.balance += amount;
        this.props.updatedAt = new Date();
    }

    /**
     * Debit wallet with specified amount
     */
    debit(amount: number): void {
        if (!this.canDebit(amount)) {
            throw new Error(
                `Insufficient available balance. Available: ${this.getAvailableBalance()}, Required: ${amount}`
            );
        }

        this.props.balance -= amount;
        this.props.updatedAt = new Date();

        // Ensure balance doesn't go negative due to floating point errors
        if (this.props.balance < 0) {
            this.props.balance = 0;
        }
    }

    /**
     * Freeze specified amount
     */
    freeze(amount: number): void {
        if (amount <= 0) {
            throw new Error('Freeze amount must be positive');
        }

        if (this.props.status !== WalletStatus.ACTIVE) {
            throw new Error('Can only freeze funds in active wallet');
        }

        const availableBalance = this.getAvailableBalance();
        if (amount > availableBalance) {
            throw new Error(
                `Cannot freeze ${amount}. Available balance: ${availableBalance}`
            );
        }

        this.props.frozenAmount += amount;
        this.props.updatedAt = new Date();
    }

    /**
     * Unfreeze specified amount
     */
    unfreeze(amount: number): void {
        if (amount <= 0) {
            throw new Error('Unfreeze amount must be positive');
        }

        if (amount > this.props.frozenAmount) {
            throw new Error(
                `Cannot unfreeze ${amount}. Frozen amount: ${this.props.frozenAmount}`
            );
        }

        this.props.frozenAmount -= amount;
        this.props.updatedAt = new Date();

        // Ensure frozen amount doesn't go negative due to floating point errors
        if (this.props.frozenAmount < 0) {
            this.props.frozenAmount = 0;
        }
    }

    /**
     * Debit from frozen amount (used when completing a transaction)
     */
    debitFrozen(amount: number): void {
        if (amount <= 0) {
            throw new Error('Debit amount must be positive');
        }

        if (amount > this.props.frozenAmount) {
            throw new Error(
                `Cannot debit ${amount} from frozen. Frozen amount: ${this.props.frozenAmount}`
            );
        }

        this.props.frozenAmount -= amount;
        this.props.balance -= amount;
        this.props.updatedAt = new Date();

        // Ensure no negative values
        if (this.props.frozenAmount < 0) {
            this.props.frozenAmount = 0;
        }
        if (this.props.balance < 0) {
            this.props.balance = 0;
        }
    }

    /**
     * Activate wallet
     */
    activate(): void {
        if (this.props.status === WalletStatus.CLOSED) {
            throw new Error('Cannot activate a closed wallet');
        }

        this.props.status = WalletStatus.ACTIVE;
        this.props.updatedAt = new Date();
    }

    /**
     * Freeze wallet (different from freezing funds)
     */
    freezeWallet(): void {
        if (this.props.status === WalletStatus.CLOSED) {
            throw new Error('Cannot freeze a closed wallet');
        }

        this.props.status = WalletStatus.FROZEN;
        this.props.updatedAt = new Date();
    }

    /**
     * Suspend wallet
     */
    suspend(): void {
        if (this.props.status === WalletStatus.CLOSED) {
            throw new Error('Cannot suspend a closed wallet');
        }

        this.props.status = WalletStatus.SUSPENDED;
        this.props.updatedAt = new Date();
    }

    /**
     * Close wallet
     */
    close(): void {
        if (this.props.balance > 0) {
            throw new Error('Cannot close wallet with positive balance');
        }

        if (this.props.frozenAmount > 0) {
            throw new Error('Cannot close wallet with frozen funds');
        }

        this.props.status = WalletStatus.CLOSED;
        this.props.updatedAt = new Date();
    }

    /**
     * Validate wallet invariants
     */
    private validateInvariants(): void {
        if (this.props.balance < 0) {
            throw new Error('Balance cannot be negative');
        }

        if (this.props.frozenAmount < 0) {
            throw new Error('Frozen amount cannot be negative');
        }

        if (this.props.frozenAmount > this.props.balance) {
            throw new Error('Frozen amount cannot exceed balance');
        }
    }

    /**
     * Validate wallet props
     */
    private validateProps(props: WalletProps): void {
        if (!props.id || props.id.trim() === '') {
            throw new Error('Wallet ID is required');
        }

        if (!props.userId || props.userId.trim() === '') {
            throw new Error('User ID is required');
        }

        if (props.balance < 0) {
            throw new Error('Balance cannot be negative');
        }

        if (!props.currency || props.currency.trim() === '') {
            throw new Error('Currency is required');
        }

        if (!Object.values(WalletStatus).includes(props.status)) {
            throw new Error(`Invalid wallet status: ${props.status}`);
        }

        if (props.frozenAmount < 0) {
            throw new Error('Frozen amount cannot be negative');
        }

        if (props.frozenAmount > props.balance) {
            throw new Error('Frozen amount cannot exceed balance');
        }
    }

    /**
     * Create a snapshot of the wallet
     */
    toObject(): WalletProps {
        return { ...this.props };
    }
}
