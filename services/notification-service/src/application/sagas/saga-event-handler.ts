import { NotificationCreatedEvent, NotificationFailedEvent } from '../../domain/events';
import { Notification } from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories';
import { INotificationPreferenceRepository } from '../../domain/repositories';
import { NotificationValidationService } from '../../domain/services/notification-validation.service';
import { executeNotificationDeliverySaga } from './notification-delivery.saga';
import { logger } from '../../infrastructure/services/logger.service';
import { EventEnvelope, IEventBus } from '@shared/events/eventBus';

export interface UserRegisteredEventPayload {
  aggregateId: string;
  email?: string;
  role?: string;
  metadata?: Record<string, any>;
}

export class SagaEventHandler {
  constructor(
    private notificationRepository: INotificationRepository,
    private preferenceRepository: INotificationPreferenceRepository,
    private validationService: NotificationValidationService,
    private sendViaChannel: (n: Notification) => Promise<void>,
    private recordMetrics: (id: string, ch: string) => Promise<void>
  ) {}

  setupSubscriptions(eventBus: IEventBus): void {
    eventBus.subscribe('NotificationCreated', async (envelope: EventEnvelope) => {
      await this.handleNotificationCreatedEvent(envelope.data as NotificationCreatedEvent);
    });

    eventBus.subscribe('NotificationFailed', async (envelope: EventEnvelope) => {
      await this.handleNotificationFailedEvent(envelope.data as NotificationFailedEvent);
    });

    eventBus.subscribe('UserRegistered', async (envelope: EventEnvelope) => {
      await this.handleUserRegisteredEvent(envelope.data as UserRegisteredEventPayload);
    });

    // ── Seller Stock Verification Events ────────────────────────────────────
    eventBus.subscribe('order.pending_seller_verification', async (envelope: EventEnvelope) => {
      await this.handlePendingSellerVerification(envelope.data ?? envelope);
    });

    eventBus.subscribe('order.seller_verified', async (envelope: EventEnvelope) => {
      await this.handleSellerVerified(envelope.data ?? envelope);
    });

    eventBus.subscribe('order.seller_declined', async (envelope: EventEnvelope) => {
      await this.handleSellerDeclined(envelope.data ?? envelope);
    });

    eventBus.subscribe('order.verification_overdue', async (envelope: EventEnvelope) => {
      await this.handleVerificationOverdue(envelope.data ?? envelope);
    });

    // ── Maysar Request Events (§4.2, request-service outbox) ────────────
    eventBus.subscribe('request.submitted', async (envelope: EventEnvelope) => {
      await this.handleRequestSubmitted(envelope.data ?? envelope);
    });
    eventBus.subscribe('request.assessing', async (envelope: EventEnvelope) => {
      await this.handleRequestAssessing(envelope.data ?? envelope);
    });
    eventBus.subscribe('request.needs_clarification', async (envelope: EventEnvelope) => {
      await this.handleRequestNeedsClarification(envelope.data ?? envelope);
    });
    eventBus.subscribe('request.fulfillable', async (envelope: EventEnvelope) => {
      await this.handleRequestFulfillable(envelope.data ?? envelope);
    });
    eventBus.subscribe('request.unfulfillable', async (envelope: EventEnvelope) => {
      await this.handleRequestUnfulfillable(envelope.data ?? envelope);
    });
    eventBus.subscribe('request.cancelled', async (envelope: EventEnvelope) => {
      await this.handleRequestCancelled(envelope.data ?? envelope);
    });
    eventBus.subscribe('quote.published', async (envelope: EventEnvelope) => {
      await this.handleQuotePublished(envelope.data ?? envelope);
    });
    eventBus.subscribe('quote.expiring_soon', async (envelope: EventEnvelope) => {
      await this.handleQuoteExpiringSoon(envelope.data ?? envelope);
    });
    eventBus.subscribe('quote.expired', async (envelope: EventEnvelope) => {
      await this.handleQuoteExpired(envelope.data ?? envelope);
    });
    eventBus.subscribe('request.converted', async (envelope: EventEnvelope) => {
      await this.handleRequestConverted(envelope.data ?? envelope);
    });
    eventBus.subscribe('supplier.invite_recommended', async (envelope: EventEnvelope) => {
      await this.handleSupplierInviteRecommended(envelope.data ?? envelope);
    });
  }

  /** Notify seller that a new order requires stock confirmation */
  private async handlePendingSellerVerification(payload: any): Promise<void> {
    try {
      const { orderId, sellerId, buyerId, verificationDeadlineAt, trackingNumber } = payload;
      logger.info('[Notification] order.pending_seller_verification', { orderId, sellerId });

      // Notify the SELLER — stock confirmation required
      await this.sendInAppNotification(sellerId, {
        type: 'ORDER_VERIFICATION_REQUIRED',
        title: 'New Order — Stock Confirmation Required',
        content: `New order ${trackingNumber ?? orderId} received. Please confirm stock availability by ${verificationDeadlineAt ? new Date(verificationDeadlineAt).toLocaleTimeString() : 'soon'}.`,
        data: { orderId, buyerId, verificationDeadlineAt, trackingNumber, actionUrl: `/orders/${orderId}` },
      });

      // Notify the BUYER — order placed confirmation (MISSING UNTIL NOW)
      await this.sendInAppNotification(buyerId, {
        type: 'ORDER_PLACED',
        title: 'Order Placed Successfully',
        content: `Your order ${trackingNumber ?? orderId} has been placed. The seller will confirm stock availability shortly.`,
        data: { orderId, trackingNumber, actionUrl: `/orders/${orderId}` },
      });
    } catch (err: any) {
      logger.warn('[Notification] handlePendingSellerVerification failed (non-fatal)', { err: err.message });
    }
  }

  /** Notify buyer that the seller has confirmed stock */
  private async handleSellerVerified(payload: any): Promise<void> {
    try {
      const { orderId, sellerId, buyerId, trackingNumber } = payload;
      logger.info('[Notification] order.seller_verified', { orderId, buyerId });
      await this.sendInAppNotification(buyerId, {
        type: 'ORDER_VERIFIED',
        title: 'Seller Confirmed — Ready for Checkout',
        content: `Great news! The seller has confirmed stock for order ${trackingNumber ?? orderId}. You can now proceed to checkout.`,
        data: { orderId, sellerId, trackingNumber, actionUrl: `/orders/${orderId}/checkout` },
      });
    } catch (err: any) {
      logger.warn('[Notification] handleSellerVerified failed (non-fatal)', { err: err.message });
    }
  }

  /** Notify buyer that the seller declined the order */
  private async handleSellerDeclined(payload: any): Promise<void> {
    try {
      const { orderId, sellerId, buyerId, reason } = payload;
      logger.info('[Notification] order.seller_declined', { orderId, buyerId });
      await this.sendInAppNotification(buyerId, {
        type: 'ORDER_DECLINED',
        title: 'Order Could Not Be Fulfilled',
        content: `Unfortunately, the seller was unable to confirm stock for order ${orderId}. ${reason ? `Reason: ${reason}` : 'Please contact support for assistance.'}`,
        data: { orderId, sellerId, reason },
      });
    } catch (err: any) {
      logger.warn('[Notification] handleSellerDeclined failed (non-fatal)', { err: err.message });
    }
  }

  /** Notify all admins that a seller missed the verification deadline */
  private async handleVerificationOverdue(payload: any): Promise<void> {
    try {
      const { orderId, sellerId, buyerId, verificationDeadlineAt, overdueByMs } = payload;
      const overdueMinutes = Math.round((overdueByMs ?? 0) / 60_000);
      logger.info('[Notification] order.verification_overdue', { orderId, sellerId });

      // Find all admin users and notify them
      const prisma = (globalThis as any).prisma;
      if (prisma) {
        const adminUsers = await prisma.user_User.findMany({
          where: { role: 'ADMIN', status: 'ACTIVE' },
          select: { id: true },
        }).catch(() => []);

        for (const admin of adminUsers) {
          await this.sendInAppNotification(admin.id, {
            type: 'SELLER_VERIFICATION_OVERDUE',
            title: `⚠️ Verification Overdue — Order ${orderId}`,
            content: `Seller ${sellerId} has not confirmed stock for order ${orderId}. Deadline was ${verificationDeadlineAt ? new Date(verificationDeadlineAt).toISOString() : 'unknown'} (${overdueMinutes} minutes ago). Admin intervention required.`,
            data: { orderId, sellerId, buyerId, verificationDeadlineAt, overdueByMs },
          });
        }
      }
    } catch (err: any) {
      logger.warn('[Notification] handleVerificationOverdue failed (non-fatal)', { err: err.message });
    }
  }

  // ── Maysar Request Events (§4.2, request-service outbox) ───────────────────
  //
  // Audience resolution: these events carry domain identifiers only
  // (requestId / customerId / providerId / quoteId / supplierId) — never a
  // notification recipient. `resolveRequestRecipients` is the single place that
  // maps an event onto the people who should hear about it, so the rules stay
  // auditable instead of being re-guessed in each handler.

  /** request.submitted — the customer gets confirmation; the platform starts assessing. */
  private async handleRequestSubmitted(payload: any): Promise<void> {
    await this.withHandler('request.submitted', payload, async () => {
      const { requestId, customerId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId, customerId);
      const recipient = customerId ?? ctx.customerId;
      if (!recipient) return;
      await this.sendInAppNotification(recipient, {
        type: 'REQUEST_SUBMITTED',
        title: 'Request Received',
        content: `We have received your request "${ctx.title ?? requestId}" and started assessing supplier options.`,
        data: { requestId, actionUrl: `/requests/${requestId}` },
      });
    });
  }

  /** request.assessing — a provider picked up the request. */
  private async handleRequestAssessing(payload: any): Promise<void> {
    await this.withHandler('request.assessing', payload, async () => {
      const { requestId, providerId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'REQUEST_ASSESSING',
        title: 'Request Being Assessed',
        content: `A supplier is now assessing your request "${ctx.title ?? requestId}".`,
        data: { requestId, providerId, actionUrl: `/requests/${requestId}` },
      });
    });
  }

  /** request.needs_clarification — the customer must supply more information. */
  private async handleRequestNeedsClarification(payload: any): Promise<void> {
    await this.withHandler('request.needs_clarification', payload, async () => {
      const { requestId, providerId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'REQUEST_NEEDS_CLARIFICATION',
        title: 'More Information Needed',
        content: `We need a little more information to continue assessing your request "${ctx.title ?? requestId}".`,
        priority: 'high',
        data: { requestId, providerId, actionUrl: `/requests/${requestId}` },
      });
    });
  }

  /** request.fulfillable — a supplier confirmed the request can be met. */
  private async handleRequestFulfillable(payload: any): Promise<void> {
    await this.withHandler('request.fulfillable', payload, async () => {
      const { requestId, providerId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'REQUEST_FULFILLABLE',
        title: 'Your Request Can Be Fulfilled',
        content: `Good news — your request "${ctx.title ?? requestId}" can be fulfilled. You will be able to accept a quote shortly.`,
        data: { requestId, providerId, actionUrl: `/requests/${requestId}` },
      });
    });
  }

  /** request.unfulfillable — the supplier could not meet the request. */
  private async handleRequestUnfulfillable(payload: any): Promise<void> {
    await this.withHandler('request.unfulfillable', payload, async () => {
      const { requestId, providerId, reason } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'REQUEST_UNFULFILLABLE',
        title: 'Request Cannot Be Fulfilled',
        content: `Unfortunately we are unable to fulfil "${ctx.title ?? requestId}".${reason ? ` Reason: ${reason}` : ''}`,
        priority: 'high',
        data: { requestId, providerId, reason, actionUrl: `/requests/${requestId}` },
      });
    });
  }

  /** request.cancelled — notify the assigned provider that work is off. */
  private async handleRequestCancelled(payload: any): Promise<void> {
    await this.withHandler('request.cancelled', payload, async () => {
      const { requestId, customerId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId, customerId);
      if (!ctx.providerId) return;
      await this.sendInAppNotification(ctx.providerId, {
        type: 'REQUEST_CANCELLED',
        title: 'Request Cancelled',
        content: `The customer has cancelled request "${ctx.title ?? requestId}". No further action is needed.`,
        data: { requestId, customerId: ctx.customerId, actionUrl: `/requests/${requestId}` },
      });
    });
  }

  /** quote.published — a new quote is available for the customer to review. */
  private async handleQuotePublished(payload: any): Promise<void> {
    await this.withHandler('quote.published', payload, async () => {
      const { quoteId, requestId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'QUOTE_PUBLISHED',
        title: 'New Quote Available',
        content: `A quote is ready for your request "${ctx.title ?? requestId}". Review it before it expires.`,
        data: { quoteId, requestId, actionUrl: `/requests/${requestId}/quotes/${quoteId}` },
      });
    });
  }

  /** quote.expiring_soon — nudge before the quote lapses. */
  private async handleQuoteExpiringSoon(payload: any): Promise<void> {
    await this.withHandler('quote.expiring_soon', payload, async () => {
      const { quoteId, requestId, validUntil } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      const when = validUntil ? new Date(validUntil).toLocaleString() : 'soon';
      await this.sendInAppNotification(ctx.customerId, {
        type: 'QUOTE_EXPIRING_SOON',
        title: 'Quote Expiring Soon',
        content: `Your quote for "${ctx.title ?? requestId}" expires ${when}. Accept it to avoid losing the price.`,
        data: { quoteId, requestId, validUntil, actionUrl: `/requests/${requestId}/quotes/${quoteId}` },
      });
    });
  }

  /** quote.expired — the quote lapsed; the request returns to ASSESSING. */
  private async handleQuoteExpired(payload: any): Promise<void> {
    await this.withHandler('quote.expired', payload, async () => {
      const { quoteId, requestId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'QUOTE_EXPIRED',
        title: 'Quote Expired',
        content: `A quote for "${ctx.title ?? requestId}" has expired. We are reassessing your request with other suppliers.`,
        data: { quoteId, requestId, actionUrl: `/requests/${requestId}` },
      });
    });
  }

  /** request.converted — an accepted quote became a real order. */
  private async handleRequestConverted(payload: any): Promise<void> {
    await this.withHandler('request.converted', payload, async () => {
      const { requestId, orderId } = payload;
      const ctx = await this.resolveRequestRecipients(requestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'REQUEST_CONVERTED',
        title: 'Request Converted to Order',
        content: `Your request "${ctx.title ?? requestId}" is now an order. You can track it from your orders page.`,
        data: { requestId, orderId, actionUrl: `/orders/${orderId}` },
      });
    });
  }

  /** supplier.invite_recommended — a supplier was found via a request. */
  private async handleSupplierInviteRecommended(payload: any): Promise<void> {
    await this.withHandler('supplier.invite_recommended', payload, async () => {
      const { supplierId, requestId, supplierName, discoveredViaRequestId } = payload;
      // This event names a supplier, not a user. It is only actionable when the
      // supplier was discovered through a request, and then only for that customer.
      const linkedRequestId = discoveredViaRequestId ?? requestId;
      if (!linkedRequestId) return;
      const ctx = await this.resolveRequestRecipients(linkedRequestId);
      if (!ctx.customerId) return;
      await this.sendInAppNotification(ctx.customerId, {
        type: 'SUPPLIER_INVITE_RECOMMENDED',
        title: 'Supplier Recommendation',
        content: `We found a potential supplier${supplierName ? ` (${supplierName})` : ''} for your request "${ctx.title ?? linkedRequestId}".`,
        data: { supplierId, requestId: linkedRequestId, actionUrl: `/requests/${linkedRequestId}` },
      });
    });
  }

  /**
   * Map a request-domain event onto its audience.
   *
   * The event payloads carry only domain ids. `Request_Request` is the source of
   * truth for who owns a request, and a `customerId` from the payload is used as
   * a fallback so events that already name a customer still work if the row has
   * not landed yet. Returns nulls rather than throwing: a missing request must
   * not take down the event bus subscription.
   */
  private async resolveRequestRecipients(
    requestId?: string,
    fallbackCustomerId?: string,
  ): Promise<{ customerId: string | null; providerId: string | null; title: string | null }> {
    const fallback = { customerId: fallbackCustomerId ?? null, providerId: null, title: null };
    if (!requestId) return fallback;

    const prisma = (globalThis as any).prisma;
    if (!prisma?.Request_Request?.findUnique) return fallback;

    try {
      const row = await prisma.Request_Request.findUnique({
        where: { id: requestId },
        select: { customerId: true, assignedProviderId: true, title: true },
      });
      if (!row) {
        logger.warn('[Notification] request not found while resolving recipients', { requestId });
        return fallback;
      }
      return {
        customerId: row.customerId ?? fallbackCustomerId ?? null,
        providerId: row.assignedProviderId ?? null,
        title: row.title ?? null,
      };
    } catch (err: any) {
      logger.warn('[Notification] failed to resolve request recipients', { requestId, err: err.message });
      return fallback;
    }
  }

  /**
   * Uniform event wrapper: run the handler, swallow failures.
   *
   * Notification delivery is best-effort — an error here must never propagate
   * into the event bus and trigger redelivery of the publisher's domain event.
   */
  private async withHandler(
    eventName: string,
    payload: any,
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      await fn();
    } catch (err: any) {
      logger.warn(`[Notification] ${eventName} handler failed (non-fatal)`, {
        err: err?.message,
        requestId: payload?.requestId,
        quoteId: payload?.quoteId,
      });
    }
  }

  /**
   * Helper: persist an in-app notification.
   *
   * Two schema facts this method previously got wrong, both of which made it a
   * silent no-op for every caller:
   *
   * 1. The Prisma model is `Notification` (table `notification_notifications`).
   *    This method probed `notification_Notification` and then `notification`,
   *    neither of which exists. Because it used optional chaining (`?.create?.`)
   *    it resolved to `undefined`, skipped the body, and returned without
   *    throwing or logging — so the four live order handlers below appeared to
   *    work while writing nothing at all.
   * 2. `Notification.type` is a CHANNEL enum
   *    (email | sms | push | in_app | webhook), not a semantic category. The
   *    callers passed values like 'ORDER_PLACED' / 'ORDER_VERIFIED', which match
   *    no enum member, so even with the right model every write would have been
   *    rejected by enum validation. The semantic category now travels in the
   *    `data` JSON as `notificationType`; `subject`/`content` carry the copy.
   *
   * There is no `channel` column — `type` *is* the channel.
   */
  private async sendInAppNotification(
    userId: string,
    opts: {
      type: string;
      title: string;
      content: string;
      data?: Record<string, unknown>;
      priority?: 'low' | 'normal' | 'high' | 'critical';
    },
  ): Promise<void> {
    const prisma = (globalThis as any).prisma;
    const delegate = prisma?.Notification;
    if (!delegate?.create) {
      logger.error('[Notification] Prisma `Notification` delegate unavailable; notification NOT persisted', {
        userId,
        notificationType: opts.type,
      });
      return;
    }

    try {
      await delegate.create({
        data: {
          userId,
          type: 'in_app',
          priority: opts.priority ?? 'normal',
          subject: opts.title,
          content: opts.content,
          data: { notificationType: opts.type, ...(opts.data ?? {}) },
          status: 'pending',
        },
      });
    } catch (err: any) {
      logger.warn('[Notification] Failed to persist in-app notification', {
        userId,
        notificationType: opts.type,
        err: err.message,
      });
    }
  }

  async handleNotificationCreatedEvent(event: NotificationCreatedEvent): Promise<void> {
    try {
      logger.info('Handling NotificationCreatedEvent', { eventId: event.eventId });
      const notification = await this.notificationRepository.findById(event.aggregateId);
      if (!notification) {
        logger.warn('Notification not found for created event', { aggregateId: event.aggregateId });
        return;
      }
      await executeNotificationDeliverySaga(
        notification,
        this.notificationRepository,
        this.preferenceRepository,
        this.validationService,
        this.sendViaChannel,
        this.recordMetrics
      );
    } catch (error) {
      logger.error('Failed to handle NotificationCreatedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleNotificationFailedEvent(event: NotificationFailedEvent): Promise<void> {
    try {
      logger.info('Handling NotificationFailedEvent', { eventId: event.eventId });
      const notification = await this.notificationRepository.findById(event.aggregateId);
      if (!notification || !notification.canRetry()) return;
      await executeNotificationDeliverySaga(
        notification,
        this.notificationRepository,
        this.preferenceRepository,
        this.validationService,
        this.sendViaChannel,
        this.recordMetrics
      );
    } catch (error) {
      logger.error('Failed to handle NotificationFailedEvent', { eventId: event.eventId, error });
      throw error;
    }
  }

  async handleUserRegisteredEvent(payload: UserRegisteredEventPayload): Promise<void> {
    try {
      logger.info('Handling UserRegisteredEvent (welcome notification)', { userId: payload.aggregateId });
      // In a full implementation: create welcome notification and trigger delivery saga
      // For now we only log; actual creation would use SendNotificationUseCase
    } catch (error) {
      logger.error('Failed to handle UserRegisteredEvent', { userId: payload.aggregateId, error });
      throw error;
    }
  }
}
