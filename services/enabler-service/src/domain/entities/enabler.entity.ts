import { Enabler_Status, Enabler_Tier } from '@prisma/client';

export interface EnablerProfileProps {
    id: string;
    userId: string;
    businessName: string;
    contactEmail: string;
    contactPhone?: string | null;
    businessDescription?: string | null;
    status: Enabler_Status;
    verificationStatus: string;
    tier: Enabler_Tier;
    commissionRate: number;
    totalSales: number;
    totalOrders: number;
    conversionRate: number;
    customerRating?: number | null;
    totalCommissionEarned: number;
    businessAddress?: string | null;
    taxId?: string | null;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    rejectionReason?: string | null;
    metadata?: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Enabler entity - Core enabler profile with business logic
 */
export class EnablerEntity {
    private constructor(private readonly props: EnablerProfileProps) { }

    static create(props: EnablerProfileProps): EnablerEntity {
        return new EnablerEntity(props);
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get userId(): string {
        return this.props.userId;
    }

    get businessName(): string {
        return this.props.businessName;
    }

    get status(): Enabler_Status {
        return this.props.status;
    }

    get tier(): Enabler_Tier {
        return this.props.tier;
    }

    get commissionRate(): number {
        return this.props.commissionRate;
    }

    get totalSales(): number {
        return this.props.totalSales;
    }

    get totalOrders(): number {
        return this.props.totalOrders;
    }

    get conversionRate(): number {
        return this.props.conversionRate;
    }

    get isApproved(): boolean {
        return this.props.status === Enabler_Status.APPROVED || this.props.status === Enabler_Status.ACTIVE;
    }

    get isActive(): boolean {
        return this.props.status === Enabler_Status.ACTIVE;
    }

    // Business methods
    canListProducts(): boolean {
        return this.isApproved && this.props.status !== Enabler_Status.SUSPENDED;
    }

    canFacilitateOrders(): boolean {
        return this.props.status === Enabler_Status.ACTIVE;
    }

    calculateCommissionRate(orderAmount: number, performanceMultiplier: number = 1.0): number {
        const baseRate = this.props.commissionRate;
        const tierAdjustment = this.getTierAdjustment();
        const finalRate = baseRate * tierAdjustment * performanceMultiplier;
        return Math.min(finalRate, 0.25); // Cap at 25%
    }

    private getTierAdjustment(): number {
        switch (this.props.tier) {
            case Enabler_Tier.BRONZE:
                return 1.0;
            case Enabler_Tier.SILVER:
                return 1.1;
            case Enabler_Tier.GOLD:
                return 1.2;
            case Enabler_Tier.PLATINUM:
                return 1.3;
            default:
                return 1.0;
        }
    }

    isEligibleForTierUpgrade(): boolean {
        if (this.props.tier === Enabler_Tier.PLATINUM) return false;

        const salesThreshold = this.getTierUpgradeThreshold();
        const ratingThreshold = 4.0;
        const conversionThreshold = 0.05;

        return (
            this.props.totalSales >= salesThreshold &&
            (this.props.customerRating || 0) >= ratingThreshold &&
            this.props.conversionRate >= conversionThreshold
        );
    }

    private getTierUpgradeThreshold(): number {
        switch (this.props.tier) {
            case Enabler_Tier.BRONZE:
                return 10000;
            case Enabler_Tier.SILVER:
                return 50000;
            case Enabler_Tier.GOLD:
                return 200000;
            default:
                return Infinity;
        }
    }

    // State transitions
    approve(approvedBy: string): void {
        if (this.props.status !== Enabler_Status.PENDING) {
            throw new Error('Only pending enablers can be approved');
        }
        this.props.status = Enabler_Status.APPROVED;
        this.props.approvedBy = approvedBy;
        this.props.approvedAt = new Date();
        this.props.rejectionReason = null;
    }

    activate(): void {
        if (this.props.status !== Enabler_Status.APPROVED) {
            throw new Error('Only approved enablers can be activated');
        }
        this.props.status = Enabler_Status.ACTIVE;
    }

    suspend(reason: string): void {
        if (this.props.status !== Enabler_Status.ACTIVE) {
            throw new Error('Only active enablers can be suspended');
        }
        this.props.status = Enabler_Status.SUSPENDED;
        this.props.metadata = { ...this.props.metadata, suspensionReason: reason };
    }

    reject(reason: string): void {
        if (this.props.status !== Enabler_Status.PENDING) {
            throw new Error('Only pending enablers can be rejected');
        }
        this.props.status = Enabler_Status.REJECTED;
        this.props.rejectionReason = reason;
    }

    upgradeTier(): void {
        if (!this.isEligibleForTierUpgrade()) {
            throw new Error('Enabler not eligible for tier upgrade');
        }

        switch (this.props.tier) {
            case Enabler_Tier.BRONZE:
                this.props.tier = Enabler_Tier.SILVER;
                this.props.commissionRate = 0.17;
                break;
            case Enabler_Tier.SILVER:
                this.props.tier = Enabler_Tier.GOLD;
                this.props.commissionRate = 0.19;
                break;
            case Enabler_Tier.GOLD:
                this.props.tier = Enabler_Tier.PLATINUM;
                this.props.commissionRate = 0.22;
                break;
        }
    }

    downgradeTier(reason: string): void {
        if (this.props.tier === Enabler_Tier.BRONZE) {
            throw new Error('Cannot downgrade from Bronze tier');
        }

        switch (this.props.tier) {
            case Enabler_Tier.PLATINUM:
                this.props.tier = Enabler_Tier.GOLD;
                this.props.commissionRate = 0.19;
                break;
            case Enabler_Tier.GOLD:
                this.props.tier = Enabler_Tier.SILVER;
                this.props.commissionRate = 0.17;
                break;
            case Enabler_Tier.SILVER:
                this.props.tier = Enabler_Tier.BRONZE;
                this.props.commissionRate = 0.15;
                break;
        }

        this.props.metadata = { ...this.props.metadata, downgradeReason: reason };
    }

    updatePerformanceMetrics(sales: number, orders: number, rating: number, conversionRate: number): void {
        this.props.totalSales += sales;
        this.props.totalOrders += orders;
        this.props.customerRating = rating;
        this.props.conversionRate = conversionRate;
    }

    toPlainObject(): EnablerProfileProps {
        return { ...this.props };
    }
}
