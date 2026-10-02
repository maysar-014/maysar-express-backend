import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderStatus } from '../../domain/entities/order.entity';
import { VerificationStateMachine } from '../../domain/state-machine/verification-state-machine';
import { VerificationAuditLogRepository } from '../../domain/repositories/verification-audit-log.repository';
import { CODEligibilityEngine } from '../../domain/engines/cod-eligibility.engine';
import { CODCommitmentService } from '../../domain/services/cod-commitment.service';
import { makeId } from '@shared/ids/id';
import { logger } from '../../infrastructure/monitoring/logger';

export interface BuyerConfirmCheckoutInput {
  orderId: string;
  buyerId: string;
}

export interface BuyerConfirmCheckoutOutput {
  orderId: string;
  newStatus: OrderStatus;
  /** COD commitment hold ID (COD orders only) */
  codCommitmentHoldId?: string;
  /** COD commitment fee amount */
  codCommitmentFee?: number;
  /** Amount buyer pays courier at door (COD only) */
  cashOnDeliveryAmount?: number;
  /** Payment URL for card/mobile-money (non-COD orders requiring gateway) */
  paymentUrl?: string;
}

export class BuyerConfirmCheckoutUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly auditLogRepository: VerificationAuditLogRepository,
    private readonly eventPublisher: { publish(event: any): Promise<void> },
    private readonly codEligibilityEngine?: CODEligibilityEngine,
    private readonly codCommitmentService?: CODCommitmentService,
    private readonly walletClient?: { debitWallet(userId: string, amount: number, currency: string, description: string, referenceId?: string): Promise<string> },
  ) {}

  async execute(input: BuyerConfirmCheckoutInput): Promise<BuyerConfirmCheckoutOutput> {
    const order = await this.orderRepository.findById(input.orderId);
    if (!order) {
      throw Object.assign(new Error(`Order ${input.orderId} not found`), { code: 'ORDER_NOT_FOUND', statusCode: 404 });
    }

    if ((order as any).buyerId !== input.buyerId) {
      throw Object.assign(new Error('You are not the buyer for this order'), { code: 'FORBIDDEN', statusCode: 403 });
    }

    const currentStatus = (order as any).status as OrderStatus;
    const transition = VerificationStateMachine.canTransition(currentStatus, OrderStatus.CONFIRMED, 'buyer');
    if (!transition.allowed) {
      throw Object.assign(new Error(transition.error ?? 'Payment is not available until the order is verified'), {
        code: 'INVALID_STATUS_TRANSITION',
        statusCode: 422,
        allowedTransitions: transition.allowedTransitions,
      });
    }

    const paymentMethod = String((order as any).paymentMethod ?? '').toUpperCase();
    const currency = String((order as any).totalAmount?.currency ?? (order as any).currency ?? 'TZS');
    const totalAmount = Number((order as any).totalAmount?.amount ?? (order as any).totalAmount ?? 0);
    const deliveryFee = Number((order as any).deliveryFee ?? 0);
    const logisticsEstimate = Number((order as any).logisticsEstimate ?? 0);

    let codCommitmentFee = 0;
    let codHoldId: string | undefined;

    const now = new Date();

    // ── COD path ──────────────────────────────────────────────────────────────
    if (paymentMethod === 'COD') {
      if (this.codEligibilityEngine) {
        const buyerEl = await this.codEligibilityEngine.checkBuyerEligibility(input.buyerId);
        if (!buyerEl.eligible) {
          throw Object.assign(new Error(`COD Ineligible: ${buyerEl.reason}`), { code: 'COD_INELIGIBLE', statusCode: 422 });
        }
        const sellerEl = await this.codEligibilityEngine.checkSellerEligibility((order as any).sellerId);
        if (!sellerEl.eligible) {
          throw Object.assign(new Error(`COD Ineligible: ${sellerEl.reason}`), { code: 'COD_INELIGIBLE', statusCode: 422 });
        }
      }

      if (this.codCommitmentService) {
        codCommitmentFee = this.codCommitmentService.calculateCommitmentFee(deliveryFee, logisticsEstimate);
        if (codCommitmentFee > 0) {
          codHoldId = await this.codCommitmentService.secureCommitment(
            input.buyerId,
            input.orderId,
            codCommitmentFee,
            currency,
            deliveryFee === 0,
          );
        }
      }
    }

    // ── WALLET path ───────────────────────────────────────────────────────────
    if (paymentMethod === 'WALLET') {
      if (!this.walletClient) {
        throw Object.assign(new Error('Wallet payment requires WalletServiceClient'), { code: 'PAYMENT_UNAVAILABLE', statusCode: 503 });
      }
      let lastErr: Error | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 300));
        try {
          // The order id must be stored as the transaction's referenceId. Order
          // cancellation looks the debit up by referenceId to decide whether a
          // refund is owed; without it the refund was silently skipped and a paid
          // order that was later cancelled kept the customer's money debited.
          await this.walletClient.debitWallet(
            input.buyerId,
            totalAmount,
            currency,
            `Payment for order ${input.orderId}`,
            input.orderId,
          );
          lastErr = undefined;
          break;
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message ?? '').toLowerCase();
          if (!msg.includes('lock') && !msg.includes('concurrent') && !msg.includes('timeout')) break;
        }
      }
      if (lastErr) {
        throw Object.assign(new Error(`Wallet payment failed: ${lastErr.message}`), { code: 'PAYMENT_FAILED', statusCode: 402 });
      }
    }

    // ── Persist: order status → CONFIRMED + audit log ─────────────────────────
    const prisma = (globalThis as any).prisma;
    if (prisma) {
      await prisma.$transaction(async (tx: any) => {
        await tx.order_Order.update({
          where: { id: input.orderId },
          data: {
            status: 'CONFIRMED',
            codCommitmentFee: codCommitmentFee > 0 ? codCommitmentFee : undefined,
            codCommitmentPaid: !!codHoldId,
            codCommitmentHoldId: codHoldId ?? undefined,
            updatedAt: now,
          },
        });
        await tx.order_VerificationAuditLog.create({
          data: {
            id: makeId('vau'),
            orderId: input.orderId,
            entryType: 'STATUS_TRANSITION',
            actorType: 'buyer',
            actorId: input.buyerId,
            previousStatus: currentStatus,
            newStatus: 'CONFIRMED',
            reason: `Buyer confirmed checkout via ${paymentMethod}`,
            timestamp: now,
          },
        });
      });
    } else {
      (order as any).status = OrderStatus.CONFIRMED;
      if (codHoldId) {
        (order as any).codCommitmentHoldId = codHoldId;
        (order as any).codCommitmentPaid = true;
      }
      await this.orderRepository.update(order);
      await this.auditLogRepository.append({
        id: makeId('vau'),
        orderId: input.orderId,
        entryType: 'STATUS_TRANSITION',
        actorType: 'buyer',
        actorId: input.buyerId,
        previousStatus: currentStatus,
        newStatus: OrderStatus.CONFIRMED,
        reason: `Buyer confirmed checkout via ${paymentMethod}`,
        timestamp: now,
      });
    }

    // Publish OrderConfirmed event for downstream saga
    try {
      await this.eventPublisher.publish({ type: 'order.confirmed', orderId: input.orderId, buyerId: input.buyerId });
    } catch (err: any) {
      logger.warn('[BuyerConfirmCheckout] Confirmed event failed (non-fatal)', { orderId: input.orderId, err: err.message });
    }

    return {
      orderId: input.orderId,
      newStatus: OrderStatus.CONFIRMED,
      codCommitmentHoldId: codHoldId,
      codCommitmentFee: codCommitmentFee > 0 ? codCommitmentFee : undefined,
      cashOnDeliveryAmount: paymentMethod === 'COD' ? (deliveryFee === 0 ? totalAmount - codCommitmentFee : totalAmount) : undefined,
    };
  }
}
