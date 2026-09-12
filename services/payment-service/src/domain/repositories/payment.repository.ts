/**
 * Payment Repository
 * Interface defining payment repository operations
 * Implementation will be in infrastructure layer
 */

import { Payment } from "../entities/payment.entity";

export interface IPaymentRepository {
  /**
   * Save a new payment
   */
  save(payment: Payment): Promise<void>;

  /**
   * Find payment by ID
   */
  findById(id: string): Promise<Payment | null>;

  /**
   * Find payment by order ID
   */
  findByOrderId(orderId: string): Promise<Payment | null>;

  /**
   * Find all payments for a user
   */
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<Payment[]>;

  /**
   * Find payment by provider reference
   */
  findByProviderReference(providerRef: string): Promise<Payment | null>;

  /**
   * Find payment by caller-supplied idempotency key (duplicate-initiation protection)
   */
  findByIdempotencyKey(idempotencyKey: string): Promise<Payment | null>;

  /**
   * Update existing payment
   */
  update(payment: Payment): Promise<void>;

  /**
   * Get total payment amount for user in time window
   */
  getTotalAmountByUserId(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number>;

  /**
   * Get payment count for user in time window
   */
  getPaymentCountByUserId(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number>;

  /**
   * Find payments by status
   */
  findByStatus(status: string, limit?: number): Promise<Payment[]>;

  /**
   * Find pending payments older than specified date
   */
  findPendingOlderThan(date: Date): Promise<Payment[]>;
}
