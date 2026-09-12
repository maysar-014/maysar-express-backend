/**
 * Payment Entity
 * Pure business entity representing a payment transaction
 * No external dependencies, contains only business logic
 */

export enum PaymentStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum PaymentMethod {
  MPESA = "MPESA",
  AIRTEL_MONEY = "AIRTEL_MONEY",
  /** @deprecated legacy code for the Tigo Pesa → Mixx by Yas rebrand */
  TIGO_PESA = "TIGO_PESA",
  MIXX_BY_YAS = "MIXX_BY_YAS",
  HALOPESA = "HALOPESA",
  WALLET = "WALLET",
  BANK_TRANSFER = "BANK_TRANSFER",
  CARD = "CARD",
}

/** Operational environment a payment was created in. */
export enum PaymentEnvironment {
  SANDBOX = "SANDBOX",
  LIVE = "LIVE",
}

/**
 * Explicit payment failure codes (never collapse everything into "failed").
 * Buyer-facing responses carry a safe message; the code + technical detail
 * remain available to operations/admin tooling.
 */
export enum PaymentFailureCode {
  METHOD_DISABLED = "METHOD_DISABLED",
  METHOD_MISCONFIGURED = "METHOD_MISCONFIGURED",
  METHOD_NOT_FOUND = "METHOD_NOT_FOUND",
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  PAYMENT_DECLINED = "PAYMENT_DECLINED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_EXPIRED = "PAYMENT_EXPIRED",
  PAYMENT_CANCELLED = "PAYMENT_CANCELLED",
  PAYMENT_PENDING = "PAYMENT_PENDING",
  PAYMENT_VERIFICATION_FAILED = "PAYMENT_VERIFICATION_FAILED",
  DUPLICATE_PAYMENT = "DUPLICATE_PAYMENT",
}

export enum PaymentProvider {
  /** External payment gateway (currently Selcom-backed channels: M-Pesa, Airtel, Mixx, HaloPesa, Card). */
  PAYMENT_GATEWAY = "PAYMENT_GATEWAY",
  /** Internal Maysar wallet debit. */
  INTERNAL_WALLET = "INTERNAL_WALLET",
  /** Internal bank-transfer instruction (buyer-initiated manual transfer). */
  INTERNAL_BANK_TRANSFER = "INTERNAL_BANK_TRANSFER",
}

export interface PaymentMetadata {
  phoneNumber?: string;
  accountNumber?: string;
  providerReference?: string;
  providerTransactionId?: string;
  customerName?: string;
  customerEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface PaymentProps {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  /** Operational environment the payment was created in (never OFF). */
  environment?: PaymentEnvironment;
  /** Optional caller-supplied idempotency key for duplicate protection. */
  idempotencyKey?: string;
  metadata: PaymentMetadata;
  refundedAmount?: number;
  failureReason?: string;
  failureCode?: PaymentFailureCode;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  version?: number;
}

export class Payment {
  private static readonly SUPPORTED_CURRENCIES = [
    "TZS",
    "USD",
    "EUR",
    "GBP",
    "KES",
    "UGX",
  ];

  private props: PaymentProps;

  constructor(props: PaymentProps) {
    const normalizedProps: PaymentProps = {
      ...props,
      version: props.version ?? 1,
    };
    this.validateProps(normalizedProps);
    this.props = normalizedProps;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get method(): PaymentMethod {
    return this.props.method;
  }

  get provider(): PaymentProvider {
    return this.props.provider;
  }

  get environment(): PaymentEnvironment {
    return this.props.environment ?? PaymentEnvironment.SANDBOX;
  }

  get idempotencyKey(): string | undefined {
    return this.props.idempotencyKey;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }

  get metadata(): PaymentMetadata {
    return { ...this.props.metadata };
  }

  get refundedAmount(): number {
    return this.props.refundedAmount || 0;
  }

  get failureReason(): string | undefined {
    return this.props.failureReason;
  }

  get failureCode(): PaymentFailureCode | undefined {
    return this.props.failureCode;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get version(): number {
    return this.props.version ?? 1;
  }

  incrementVersion(): void {
    this.props.version = (this.props.version ?? 0) + 1;
  }

  // Business Methods

  /**
   * Update payment status with validation
   */
  updateStatus(newStatus: PaymentStatus, reason?: string): void {
    this.validateStatusTransition(this.props.status, newStatus);
    this.props.status = newStatus;
    this.props.updatedAt = new Date();

    if (newStatus === PaymentStatus.FAILED && reason) {
      this.props.failureReason = reason;
    }

    if (newStatus === PaymentStatus.COMPLETED) {
      this.props.completedAt = new Date();
    }
  }

  /**
   * Mark payment as completed
   */
  markAsCompleted(providerTransactionId?: string): void {
    if (this.props.status === PaymentStatus.COMPLETED) {
      throw new Error("Payment is already completed");
    }

    this.updateStatus(PaymentStatus.COMPLETED);

    if (providerTransactionId) {
      this.props.metadata.providerTransactionId = providerTransactionId;
    }
  }

  /**
   * Mark payment as failed
   */
  markAsFailed(reason: string, failureCode?: PaymentFailureCode): void {
    if (this.props.status === PaymentStatus.COMPLETED) {
      throw new Error("Cannot fail a completed payment");
    }

    if (!reason || reason.trim() === "") {
      throw new Error("Failure reason is required");
    }

    this.props.status = PaymentStatus.FAILED;
    this.props.failureReason = reason;
    if (failureCode) {
      this.props.failureCode = failureCode;
    }
    this.props.updatedAt = new Date();
  }

  /**
   * Check if payment can be refunded
   */
  canRefund(): boolean {
    if (
      this.props.status !== PaymentStatus.COMPLETED &&
      this.props.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      return false;
    }

    const refundableAmount = this.amount - this.refundedAmount;
    return refundableAmount > 0;
  }

  /**
   * Get refundable amount
   */
  getRefundableAmount(): number {
    if (!this.canRefund()) {
      return 0;
    }

    return this.amount - this.refundedAmount;
  }

  /**
   * Record refund
   */
  recordRefund(refundAmount: number): void {
    if (!this.canRefund()) {
      throw new Error("Payment cannot be refunded");
    }

    const refundableAmount = this.getRefundableAmount();
    if (refundAmount > refundableAmount) {
      throw new Error(
        `Refund amount ${refundAmount} exceeds refundable amount ${refundableAmount}`,
      );
    }

    if (refundAmount <= 0) {
      throw new Error("Refund amount must be positive");
    }

    this.props.refundedAmount = this.refundedAmount + refundAmount;
    this.props.updatedAt = new Date();

    // Update status based on refund amount
    if (this.props.refundedAmount >= this.amount) {
      this.props.status = PaymentStatus.REFUNDED;
    } else {
      this.props.status = PaymentStatus.PARTIALLY_REFUNDED;
    }
  }

  /**
   * Calculate payment fees (platform fee + provider fee)
   */
  calculateFees(): {
    platformFee: number;
    providerFee: number;
    totalFee: number;
  } {
    const platformFeePercentage = 0.02; // 2% platform fee
    const providerFeePercentage = this.getProviderFeePercentage();

    const platformFee = this.amount * platformFeePercentage;
    const providerFee = this.amount * providerFeePercentage;
    const totalFee = platformFee + providerFee;

    return {
      platformFee: Math.round(platformFee * 100) / 100,
      providerFee: Math.round(providerFee * 100) / 100,
      totalFee: Math.round(totalFee * 100) / 100,
    };
  }

  /**
   * Get provider fee percentage based on payment method
   */
  private getProviderFeePercentage(): number {
    switch (this.props.method) {
      case PaymentMethod.MPESA:
      case PaymentMethod.AIRTEL_MONEY:
      case PaymentMethod.TIGO_PESA:
      case PaymentMethod.HALOPESA:
        return 0.015; // 1.5% for mobile money
      case PaymentMethod.CARD:
        return 0.029; // 2.9% for cards
      case PaymentMethod.BANK_TRANSFER:
        return 0.01; // 1% for bank transfers
      case PaymentMethod.WALLET:
        return 0; // No fee for wallet
      default:
        return 0.02; // Default 2%
    }
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Partial<PaymentMetadata>): void {
    this.props.metadata = {
      ...this.props.metadata,
      ...metadata,
    };
    this.props.updatedAt = new Date();
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus,
  ): void {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [
        PaymentStatus.PROCESSING,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ],
      [PaymentStatus.PROCESSING]: [
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ],
      [PaymentStatus.COMPLETED]: [
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED,
      ],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED],
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Validate payment props
   */
  private validateProps(props: PaymentProps): void {
    if (!props.id || props.id.trim() === "") {
      throw new Error("Payment ID is required");
    }

    if (!props.orderId || props.orderId.trim() === "") {
      throw new Error("Order ID is required");
    }

    if (!props.userId || props.userId.trim() === "") {
      throw new Error("User ID is required");
    }

    if (props.amount <= 0) {
      throw new Error("Payment amount must be positive");
    }

    if (!props.currency || props.currency.trim() === "") {
      throw new Error("Currency is required");
    }

    if (!Payment.SUPPORTED_CURRENCIES.includes(props.currency.toUpperCase())) {
      throw new Error(`Unsupported currency: ${props.currency}`);
    }

    if (!Object.values(PaymentMethod).includes(props.method)) {
      throw new Error(`Invalid payment method: ${props.method}`);
    }

    if (!Object.values(PaymentProvider).includes(props.provider)) {
      throw new Error(`Invalid payment provider: ${props.provider}`);
    }

    if (!Object.values(PaymentStatus).includes(props.status)) {
      throw new Error(`Invalid payment status: ${props.status}`);
    }
  }

  /**
   * Create a snapshot of the payment
   */
  toObject(): PaymentProps {
    return { ...this.props };
  }
}
