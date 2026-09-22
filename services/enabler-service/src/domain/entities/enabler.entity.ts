import { Enabler_Status, Enabler_Tier } from '../types/enabler.types';
import { EnablerLifecyclePolicy } from '../policies/enabler-lifecycle.policy';

export interface EnablerProfileProps {
    id: string;
    userId: string;
    enablerCode?: string | null;
    enablerCodeShort?: string | null;
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

    // ── Enabler capability: activation requirements + lifecycle (§4–§6) ──────
    // Optional so existing constructors/tests keep working; the Prisma mapper
    // always populates them in production.
    termsVersion?: string | null;
    termsAcceptedAt?: Date | null;
    trainingStatus?: string;
    trainingCompletedAt?: Date | null;
    activatedAt?: Date | null;
    restrictedAt?: Date | null;
    restrictedReason?: string | null;
    suspendedAt?: Date | null;
    suspendedReason?: string | null;
    deactivatedAt?: Date | null;
    deactivatedReason?: string | null;
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

    get enablerCode(): string | null | undefined {
        return this.props.enablerCode;
    }

    get enablerCodeShort(): string | null | undefined {
        return this.props.enablerCodeShort;
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

    // ── Activation requirement state (§6) ────────────────────────────────────
    get termsVersion(): string | null {
        return this.props.termsVersion ?? null;
    }

    get termsAcceptedAt(): Date | null {
        return this.props.termsAcceptedAt ?? null;
    }

    get trainingStatus(): string {
        return this.props.trainingStatus ?? 'not_started';
    }

    get trainingCompletedAt(): Date | null {
        return this.props.trainingCompletedAt ?? null;
    }

    get activatedAt(): Date | null {
        return this.props.activatedAt ?? null;
    }

    // ── Lifecycle predicates (§5) ────────────────────────────────────────────
    get isRestricted(): boolean {
        return this.props.status === Enabler_Status.RESTRICTED;
    }

    get isSuspended(): boolean {
        return this.props.status === Enabler_Status.SUSPENDED;
    }

    get isDeactivated(): boolean {
        return this.props.status === Enabler_Status.DEACTIVATED;
    }

    /** True only for ACTIVE — the sole state that may perform Enabler operations. */
    get isOperational(): boolean {
        return this.props.status === Enabler_Status.ACTIVE;
    }

    /**
     * May this enabler assemble an order draft? DEACTIVATED and SUSPENDED (and
     * non-activated) enablers must never reach the Order Builder (§5, §19).
     * Delegates to the lifecycle policy so the matrix has one source of truth.
     */
    canBuildOrderDraft(): boolean {
        return EnablerLifecyclePolicy.canPerform(this.props.status, 'BUILD_ORDER_DRAFT').allowed;
    }

    /** SUSPENDED and DEACTIVATED enablers explicitly may not (§5). */
    canGenerateCustomerLink(): boolean {
        return EnablerLifecyclePolicy.canPerform(this.props.status, 'GENERATE_CUSTOMER_LINK').allowed;
    }

    /** Sharing a product only produces attribution, so RESTRICTED keeps it. */
    canShareProduct(): boolean {
        return EnablerLifecyclePolicy.canPerform(this.props.status, 'SHARE_PRODUCT').allowed;
    }

    canAccessPermanentLink(): boolean {
        return EnablerLifecyclePolicy.canPerform(this.props.status, 'ACCESS_PERMANENT_LINK').allowed;
    }

    canQualifyEarning(): boolean {
        return EnablerLifecyclePolicy.canPerform(this.props.status, 'QUALIFY_EARNING').allowed;
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

    assignEnablerCode(code: string, shortCode?: string): void {
        this.props.enablerCode = code;
        this.props.enablerCodeShort = shortCode || this.props.enablerCodeShort || null;
    }

    /**
     * Record terms acceptance (§6). The accepted version is persisted so a stale
     * acceptance can never be mistaken for the current version.
     */
    acceptTerms(termsVersion: string, acceptedAt: Date = new Date()): void {
        if (!termsVersion || !termsVersion.trim()) {
            throw new Error('A terms version is required to record acceptance');
        }
        this.props.termsVersion = termsVersion.trim();
        this.props.termsAcceptedAt = acceptedAt;
    }

    /**
     * Mirror the shared training domain's outcome onto the enabler profile.
     * Training truth is NOT owned here (§37) — this only records the result the
     * training domain reports.
     */
    recordTrainingCompletion(status: string, at: Date = new Date()): void {
        if (!status || !status.trim()) {
            throw new Error('A training status is required');
        }
        const normalized = status.trim();
        this.props.trainingStatus = normalized;
        this.props.trainingCompletedAt = normalized === 'completed' ? at : null;
    }

    /**
     * Activate the enabler. When activation requirements are supplied they are
     * enforced by the lifecycle policy, so an enabler can never become ACTIVE
     * without accepted terms / completed training (§6). Omitting the argument
     * keeps the historical transition-only behaviour for legacy callers.
     */
    activate(options?: {
        activatedAt?: Date;
        requiredTermsVersion?: string;
        trainingRequired?: boolean;
    }): void {
        if (this.props.status !== Enabler_Status.APPROVED) {
            throw new Error('Only approved enablers can be activated');
        }

        if (options) {
            const decision = EnablerLifecyclePolicy.canActivate({
                status: this.props.status,
                termsVersion: this.termsVersion,
                termsAcceptedAt: this.termsAcceptedAt,
                trainingStatus: this.trainingStatus,
                requiredTermsVersion: options.requiredTermsVersion,
                trainingRequired: options.trainingRequired,
            });
            if (!decision.allowed) {
                throw new Error(`Activation requirements not met: ${decision.reason}`);
            }
        }

        this.props.status = Enabler_Status.ACTIVE;
        this.props.activatedAt = options?.activatedAt ?? new Date();
        this.props.suspendedAt = null;
        this.props.suspendedReason = null;
        this.props.restrictedAt = null;
        this.props.restrictedReason = null;
    }

    /** Capability-limited state (§5): keeps discovery/sharing, loses drafts+links. */
    restrict(reason: string, at: Date = new Date()): void {
        if (this.props.status !== Enabler_Status.ACTIVE) {
            throw new Error('Only active enablers can be restricted');
        }
        this.props.status = Enabler_Status.RESTRICTED;
        this.props.restrictedAt = at;
        this.props.restrictedReason = reason;
    }

    suspend(reason: string, at: Date = new Date()): void {
        if (
            this.props.status !== Enabler_Status.ACTIVE &&
            this.props.status !== Enabler_Status.RESTRICTED &&
            this.props.status !== Enabler_Status.APPROVED
        ) {
            throw new Error('Only active or restricted enablers can be suspended');
        }
        this.props.status = Enabler_Status.SUSPENDED;
        this.props.suspendedAt = at;
        this.props.suspendedReason = reason;
        this.props.metadata = { ...this.props.metadata, suspensionReason: reason };
    }

    /** Return a suspended/restricted enabler to full capability. */
    reactivate(at: Date = new Date()): void {
        if (this.props.status !== Enabler_Status.SUSPENDED && this.props.status !== Enabler_Status.RESTRICTED) {
            throw new Error('Only suspended or restricted enablers can be reactivated');
        }
        this.props.status = Enabler_Status.ACTIVE;
        this.props.activatedAt = this.props.activatedAt ?? at;
        this.props.suspendedAt = null;
        this.props.suspendedReason = null;
        this.props.restrictedAt = null;
        this.props.restrictedReason = null;
    }

    /**
     * Terminal state. The underlying Maysar user is never deleted and seller /
     * courier / payment responsibilities are untouched (§52, §55).
     */
    deactivate(reason: string, at: Date = new Date()): void {
        if (this.props.status === Enabler_Status.DEACTIVATED) {
            throw new Error('Enabler is already deactivated');
        }
        this.props.status = Enabler_Status.DEACTIVATED;
        this.props.deactivatedAt = at;
        this.props.deactivatedReason = reason;
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
