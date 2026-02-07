import { Money } from '../value-objects/money.value-object';

export enum HoldStatus {
    ACTIVE = 'ACTIVE',
    RELEASED = 'RELEASED',
    EXPIRED = 'EXPIRED',
    CAPTURED = 'CAPTURED'
}

export interface HoldProps {
    id: string;
    walletId: string;
    userId: string;
    amount: Money;
    reason: string;
    status: HoldStatus;
    expiresAt: Date;
    isCaptured: boolean;
    isReleased: boolean;
    createdAt: Date;
    updatedAt: Date;
    releasedAt?: Date;
    capturedAt?: Date;
    metadata?: Record<string, any>;
}

export class Hold {
    private props: HoldProps;

    constructor(props: HoldProps) {
        this.validateProps(props);
        this.props = { ...props };
    }

    get id(): string { return this.props.id; }
    get walletId(): string { return this.props.walletId; }
    get userId(): string { return this.props.userId; }
    get amount(): Money { return this.props.amount; }
    get reason(): string { return this.props.reason; }
    get status(): HoldStatus { return this.props.status; }
    get expiresAt(): Date { return this.props.expiresAt; }
    get isCaptured(): boolean { return this.props.isCaptured; }
    get isReleased(): boolean { return this.props.isReleased; }
    get createdAt(): Date { return this.props.createdAt; }
    get updatedAt(): Date { return this.props.updatedAt; }
    get releasedAt(): Date | undefined { return this.props.releasedAt; }
    get capturedAt(): Date | undefined { return this.props.capturedAt; }
    get metadata(): Record<string, any> | undefined { return this.props.metadata; }

    public isExpired(): boolean {
        return this.props.status === HoldStatus.ACTIVE && new Date() > this.props.expiresAt;
    }

    public isActive(): boolean {
        return this.props.status === HoldStatus.ACTIVE && !this.isExpired();
    }

    public release(): void {
        if (this.props.status !== HoldStatus.ACTIVE) {
            throw new Error(`Cannot release hold in status ${this.props.status}`);
        }
        this.props.status = HoldStatus.RELEASED;
        this.props.isReleased = true;
        this.props.releasedAt = new Date();
        this.props.updatedAt = new Date();
    }

    public capture(): void {
        if (this.props.status !== HoldStatus.ACTIVE) {
            throw new Error(`Cannot capture hold in status ${this.props.status}`);
        }
        if (this.isExpired()) {
            throw new Error('Cannot capture expired hold');
        }
        this.props.status = HoldStatus.CAPTURED;
        this.props.isCaptured = true;
        this.props.capturedAt = new Date();
        this.props.updatedAt = new Date();
    }

    public expire(): void {
        if (this.props.status !== HoldStatus.ACTIVE) {
            return; // Already processed
        }
        this.props.status = HoldStatus.EXPIRED;
        this.props.updatedAt = new Date();
    }

    public extend(newExpiresAt: Date): void {
        if (this.props.status !== HoldStatus.ACTIVE) {
            throw new Error('Cannot extend non-active hold');
        }
        if (newExpiresAt <= new Date()) {
            throw new Error('New expiry date must be in the future');
        }
        this.props.expiresAt = newExpiresAt;
        this.props.updatedAt = new Date();
    }

    private validateProps(props: HoldProps): void {
        if (!props.id) throw new Error('Hold ID required');
        if (!props.walletId) throw new Error('Wallet ID required');
        if (!props.userId) throw new Error('User ID required');
        if (!props.amount) throw new Error('Amount required');
        if (props.amount.amount <= 0) throw new Error('Hold amount must be positive');
        if (!props.expiresAt) throw new Error('Expiry date required');
    }

    public toObject(): HoldProps {
        return { ...this.props };
    }
}
