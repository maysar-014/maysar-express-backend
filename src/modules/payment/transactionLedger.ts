/**
 * Transaction Ledger Pattern Implementation
 * Provides immutable, auditable transaction records for financial operations
 */

import { getEventBus } from '../../events/redisEventBus';

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  CHARGEBACK = 'CHARGEBACK',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  FEE = 'FEE'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED'
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  CRYPTOCURRENCY = 'CRYPTOCURRENCY',
  CASH = 'CASH'
}

export interface TransactionRecord {
  // Primary identifiers
  transactionId: string;
  orderId: string;
  userId: string;

  // Transaction details
  type: TransactionType;
  status: TransactionStatus;
  paymentMethod: PaymentMethod;

  // Financial amounts (stored in cents to avoid floating point issues)
  amount: number;          // Transaction amount in cents
  currency: string;        // ISO 4217 currency code
  fee: number;            // Processing fee in cents
  netAmount: number;      // Amount after fees in cents

  // External references
  externalTransactionId?: string;  // Payment processor transaction ID
  paymentIntentId?: string;        // Stripe payment intent ID
  referenceNumber?: string;        // Bank reference number

  // Metadata
  description: string;
  metadata: Record<string, any>;

  // Audit trail
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;      // Service or user that created transaction
  updatedBy: string;      // Service or user that last updated transaction

  // Processing information
  processedAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Version control for optimistic locking
  version: number;
}

export interface TransactionQuery {
  transactionId?: string;
  orderId?: string;
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;     // in cents
  totalFees: number;       // in cents
  netAmount: number;       // in cents
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  currency: string;
}

export class TransactionLedgerError extends Error {
  public readonly transactionId?: string;
  public readonly code: string;

  constructor(message: string, code: string = 'TRANSACTION_ERROR', transactionId?: string) {
    super(message);
    this.name = 'TransactionLedgerError';
    this.code = code;
    this.transactionId = transactionId;
  }
}

/**
 * Transaction Ledger - Immutable financial transaction records
 * Implements the transaction ledger pattern for financial auditability
 */
export class TransactionLedger {
  private eventBus = getEventBus();

  /**
   * Create a new transaction record
   */
  async createTransaction(transaction: Omit<TransactionRecord, 'transactionId' | 'createdAt' | 'updatedAt' | 'version'>): Promise<TransactionRecord> {
    const now = new Date();
    const transactionId = this.generateTransactionId();

    const record: TransactionRecord = {
      ...transaction,
      transactionId,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    // Validate transaction data
    this.validateTransaction(record);

    // Store transaction (in a real implementation, this would go to a database)
    await this.persistTransaction(record);

    // Publish transaction created event
    await this.eventBus.publish('TransactionCreated.v1', {
      transactionId,
      orderId: record.orderId,
      userId: record.userId,
      type: record.type,
      amount: record.amount,
      currency: record.currency,
      status: record.status
    }, {
      correlationId: `txn-${transactionId}`,
      userId: record.userId
    });

    console.log(`💰 Created transaction: ${transactionId} (${record.type}) - ${record.amount} ${record.currency}`);
    return record;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    newStatus: TransactionStatus,
    updatedBy: string,
    failureReason?: string,
    externalTransactionId?: string
  ): Promise<TransactionRecord> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new TransactionLedgerError(`Transaction not found: ${transactionId}`, 'TRANSACTION_NOT_FOUND', transactionId);
    }

    // Validate status transition
    this.validateStatusTransition(transaction.status, newStatus);

    const updatedTransaction: TransactionRecord = {
      ...transaction,
      status: newStatus,
      updatedAt: new Date(),
      updatedBy,
      version: transaction.version + 1,
      ...(failureReason && { failureReason, failedAt: new Date() }),
      ...(externalTransactionId && { externalTransactionId }),
      ...(newStatus === TransactionStatus.COMPLETED && { processedAt: new Date() })
    };

    // Persist updated transaction
    await this.persistTransaction(updatedTransaction);

    // Publish status change event
    await this.eventBus.publish('TransactionStatusChanged.v1', {
      transactionId,
      orderId: transaction.orderId,
      userId: transaction.userId,
      oldStatus: transaction.status,
      newStatus,
      failureReason,
      externalTransactionId
    }, {
      correlationId: `txn-${transactionId}`,
      userId: transaction.userId
    });

    console.log(`📊 Updated transaction ${transactionId} status: ${transaction.status} → ${newStatus}`);
    return updatedTransaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<TransactionRecord | null> {
    // In a real implementation, this would query the database
    // For now, return mock data or null
    return null; // TODO: Implement actual storage
  }

  /**
   * Query transactions with filters
   */
  async queryTransactions(query: TransactionQuery): Promise<TransactionRecord[]> {
    // In a real implementation, this would query the database with filters
    // For now, return empty array
    return []; // TODO: Implement actual querying
  }

  /**
   * Get transaction summary for a user or time period
   */
  async getTransactionSummary(
    userId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<TransactionSummary> {
    // In a real implementation, this would aggregate data from database
    const summary: TransactionSummary = {
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      netAmount: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      currency: 'USD'
    };

    return summary; // TODO: Implement actual aggregation
  }

  /**
   * Process a payment transaction
   */
  async processPayment(
    orderId: string,
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod,
    paymentMethodDetails: any,
    createdBy: string
  ): Promise<TransactionRecord> {
    const transaction = await this.createTransaction({
      orderId,
      userId,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.PENDING,
      paymentMethod,
      amount,
      currency,
      fee: this.calculateFee(amount, paymentMethod),
      netAmount: amount - this.calculateFee(amount, paymentMethod),
      description: `Payment for order ${orderId}`,
      metadata: {
        paymentMethodDetails,
        orderId
      },
      createdBy,
      updatedBy: createdBy
    });

    // Start payment processing (this would typically be handled by a payment service)
    try {
      await this.processPaymentWithProvider(transaction);
      await this.updateTransactionStatus(transaction.transactionId, TransactionStatus.COMPLETED, 'payment-service');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Payment processing failed';
      await this.updateTransactionStatus(transaction.transactionId, TransactionStatus.FAILED, 'payment-service', reason);
      throw error;
    }

    return transaction;
  }

  /**
   * Process a refund transaction
   */
  async processRefund(
    originalTransactionId: string,
    refundAmount: number,
    reason: string,
    createdBy: string
  ): Promise<TransactionRecord> {
    const originalTransaction = await this.getTransaction(originalTransactionId);
    if (!originalTransaction) {
      throw new TransactionLedgerError(`Original transaction not found: ${originalTransactionId}`, 'ORIGINAL_TRANSACTION_NOT_FOUND');
    }

    if (originalTransaction.status !== TransactionStatus.COMPLETED) {
      throw new TransactionLedgerError(`Cannot refund transaction with status: ${originalTransaction.status}`, 'INVALID_TRANSACTION_STATUS');
    }

    if (refundAmount > originalTransaction.amount) {
      throw new TransactionLedgerError('Refund amount cannot exceed original transaction amount', 'INVALID_REFUND_AMOUNT');
    }

    const refundTransaction = await this.createTransaction({
      orderId: originalTransaction.orderId,
      userId: originalTransaction.userId,
      type: TransactionType.REFUND,
      status: TransactionStatus.PENDING,
      paymentMethod: originalTransaction.paymentMethod,
      amount: refundAmount,
      currency: originalTransaction.currency,
      fee: 0, // Refunds typically don't have fees
      netAmount: refundAmount,
      description: `Refund for transaction ${originalTransactionId}: ${reason}`,
      metadata: {
        originalTransactionId,
        refundReason: reason,
        originalAmount: originalTransaction.amount
      },
      createdBy,
      updatedBy: createdBy
    });

    // Process refund
    try {
      await this.processRefundWithProvider(refundTransaction, originalTransaction);
      await this.updateTransactionStatus(refundTransaction.transactionId, TransactionStatus.COMPLETED, 'payment-service');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Refund processing failed';
      await this.updateTransactionStatus(refundTransaction.transactionId, TransactionStatus.FAILED, 'payment-service', reason);
      throw error;
    }

    return refundTransaction;
  }

  /**
   * Validate transaction data
   */
  private validateTransaction(transaction: TransactionRecord): void {
    if (!transaction.orderId) {
      throw new TransactionLedgerError('Order ID is required', 'MISSING_ORDER_ID');
    }

    if (!transaction.userId) {
      throw new TransactionLedgerError('User ID is required', 'MISSING_USER_ID');
    }

    if (transaction.amount <= 0) {
      throw new TransactionLedgerError('Transaction amount must be positive', 'INVALID_AMOUNT');
    }

    if (!transaction.currency || transaction.currency.length !== 3) {
      throw new TransactionLedgerError('Valid currency code is required', 'INVALID_CURRENCY');
    }

    if (transaction.fee < 0) {
      throw new TransactionLedgerError('Fee cannot be negative', 'INVALID_FEE');
    }

    if (transaction.netAmount !== transaction.amount - transaction.fee) {
      throw new TransactionLedgerError('Net amount calculation is incorrect', 'INVALID_NET_AMOUNT');
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(fromStatus: TransactionStatus, toStatus: TransactionStatus): void {
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatus.PENDING]: [TransactionStatus.PROCESSING, TransactionStatus.CANCELLED, TransactionStatus.FAILED],
      [TransactionStatus.PROCESSING]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.DISPUTED],
      [TransactionStatus.COMPLETED]: [TransactionStatus.DISPUTED], // Only allow disputes on completed transactions
      [TransactionStatus.FAILED]: [], // Terminal state
      [TransactionStatus.CANCELLED]: [], // Terminal state
      [TransactionStatus.DISPUTED]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED] // Resolution states
    };

    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      throw new TransactionLedgerError(
        `Invalid status transition: ${fromStatus} → ${toStatus}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Calculate processing fee based on payment method and amount
   */
  private calculateFee(amount: number, paymentMethod: PaymentMethod): number {
    // Simple fee calculation (in cents)
    // In a real implementation, this would use a fee schedule
    const feeRates: Record<PaymentMethod, number> = {
      [PaymentMethod.CREDIT_CARD]: 0.029,    // 2.9% + 30¢
      [PaymentMethod.DEBIT_CARD]: 0.015,     // 1.5% + 25¢
      [PaymentMethod.BANK_TRANSFER]: 0.01,   // 1% flat
      [PaymentMethod.DIGITAL_WALLET]: 0.025, // 2.5% + 15¢
      [PaymentMethod.CRYPTOCURRENCY]: 0.01,  // 1% flat
      [PaymentMethod.CASH]: 0               // No fee
    };

    const baseFee = feeRates[paymentMethod] || 0;
    let fee = Math.round(amount * baseFee);

    // Add fixed fees for card payments
    if (paymentMethod === PaymentMethod.CREDIT_CARD) {
      fee += 30; // 30¢ fixed fee
    } else if (paymentMethod === PaymentMethod.DEBIT_CARD) {
      fee += 25; // 25¢ fixed fee
    } else if (paymentMethod === PaymentMethod.DIGITAL_WALLET) {
      fee += 15; // 15¢ fixed fee
    }

    return fee;
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `txn_${timestamp}_${random}`;
  }

  /**
   * Persist transaction to storage
   * In a real implementation, this would save to a database
   */
  private async persistTransaction(transaction: TransactionRecord): Promise<void> {
    // TODO: Implement actual database persistence
    // This would typically use Prisma or another ORM

    // For now, just log the transaction
    console.log(`💾 Persisted transaction: ${transaction.transactionId}`, {
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency
    });
  }

  /**
   * Process payment with external payment provider
   * In a real implementation, this would integrate with Stripe, PayPal, etc.
   */
  private async processPaymentWithProvider(transaction: TransactionRecord): Promise<void> {
    // TODO: Implement actual payment provider integration
    // This would call Stripe, PayPal, or other payment processors

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Payment provider temporarily unavailable');
    }

    console.log(`💳 Processed payment with provider: ${transaction.transactionId}`);
  }

  /**
   * Process refund with external payment provider
   */
  private async processRefundWithProvider(
    refundTransaction: TransactionRecord,
    originalTransaction: TransactionRecord
  ): Promise<void> {
    // TODO: Implement actual refund processing with payment provider

    // Simulate refund processing
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`💸 Processed refund with provider: ${refundTransaction.transactionId}`);
  }
}

// Export singleton instance
let ledgerInstance: TransactionLedger | null = null;

export const getTransactionLedger = (): TransactionLedger => {
  if (!ledgerInstance) {
    ledgerInstance = new TransactionLedger();
  }
  return ledgerInstance;
};

// Types are already exported at the top of the file
