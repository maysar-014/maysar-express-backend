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

  /** Helper: persist and deliver an in-app notification */
  private async sendInAppNotification(
    userId: string,
    opts: { type: string; title: string; content: string; data?: Record<string, unknown> },
  ): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma) return;

    try {
      await prisma.notification_Notification?.create?.({
        data: {
          userId,
          type: opts.type,
          channel: 'in_app',
          subject: opts.title,
          content: opts.content,
          data: opts.data ?? {},
          status: 'pending',
          priority: 'high',
        },
      });
    } catch (err: any) {
      // Table name may differ — try the notifications model directly
      try {
        await prisma.notification?.create?.({
          data: {
            userId,
            type: opts.type,
            channel: 'in_app',
            subject: opts.title,
            content: opts.content,
            data: opts.data ?? {},
            status: 'pending',
            priority: 'high',
          },
        });
      } catch (_e) {
        logger.warn('[Notification] Failed to persist in-app notification', { userId, type: opts.type, err: err.message });
      }
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
