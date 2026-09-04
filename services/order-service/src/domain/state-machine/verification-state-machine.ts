import { OrderStatus } from '../entities/order.entity';

export type VerificationActor = 'buyer' | 'seller' | 'system' | 'admin';

export interface TransitionResult {
  allowed: boolean;
  error?: string;
  allowedTransitions?: OrderStatus[];
}

interface AllowedTransition {
  from: OrderStatus;
  to: OrderStatus;
  actors: VerificationActor[];
}

/**
 * VerificationStateMachine — pure value-object, no I/O.
 * Single source of truth for all valid order status transitions.
 * Admin override (any → any) is handled separately via the override endpoint.
 */
export const ALLOWED_TRANSITIONS: AllowedTransition[] = [
  // Order placement
  { from: OrderStatus.PENDING, to: OrderStatus.PENDING_SELLER_VERIFICATION, actors: ['system'] },

  // Seller actions
  { from: OrderStatus.PENDING_SELLER_VERIFICATION, to: OrderStatus.SELLER_VERIFIED, actors: ['seller'] },
  { from: OrderStatus.PENDING_SELLER_VERIFICATION, to: OrderStatus.SELLER_DECLINED, actors: ['seller'] },

  // System: verification deadline expired
  { from: OrderStatus.PENDING_SELLER_VERIFICATION, to: OrderStatus.VERIFICATION_OVERDUE, actors: ['system'] },

  // Buyer checkout after verification
  { from: OrderStatus.SELLER_VERIFIED, to: OrderStatus.CONFIRMED, actors: ['buyer'] },

  // Admin actions on overdue orders
  { from: OrderStatus.VERIFICATION_OVERDUE, to: OrderStatus.SELLER_VERIFIED, actors: ['admin'] },
  { from: OrderStatus.VERIFICATION_OVERDUE, to: OrderStatus.CANCELLED, actors: ['admin'] },
  { from: OrderStatus.VERIFICATION_OVERDUE, to: OrderStatus.UNDER_ADMIN_REVIEW, actors: ['admin'] },

  // Admin actions on orders under review
  { from: OrderStatus.UNDER_ADMIN_REVIEW, to: OrderStatus.SELLER_VERIFIED, actors: ['admin'] },
  { from: OrderStatus.UNDER_ADMIN_REVIEW, to: OrderStatus.CANCELLED, actors: ['admin'] },

  // Existing fulfillment flow
  { from: OrderStatus.CONFIRMED, to: OrderStatus.ASSIGNED, actors: ['system'] },
  { from: OrderStatus.CONFIRMED, to: OrderStatus.PROCESSING, actors: ['system'] },
  { from: OrderStatus.PROCESSING, to: OrderStatus.ASSIGNED, actors: ['system'] },
  { from: OrderStatus.ASSIGNED, to: OrderStatus.IN_TRANSIT, actors: ['system'] },
  { from: OrderStatus.IN_TRANSIT, to: OrderStatus.DELIVERED, actors: ['system'] },

  // Legacy: direct placement still supports PENDING → CONFIRMED for backward compat
  { from: OrderStatus.PENDING, to: OrderStatus.CONFIRMED, actors: ['buyer', 'system'] },
  { from: OrderStatus.PENDING, to: OrderStatus.ASSIGNED, actors: ['system'] },
  { from: OrderStatus.PENDING, to: OrderStatus.CANCELLED, actors: ['buyer', 'seller', 'admin', 'system'] },
  { from: OrderStatus.CONFIRMED, to: OrderStatus.CANCELLED, actors: ['buyer', 'seller', 'admin', 'system'] },
  { from: OrderStatus.ASSIGNED, to: OrderStatus.CANCELLED, actors: ['admin', 'system'] },
];

export class VerificationStateMachine {
  /**
   * Check whether a transition is allowed for the given actor.
   * Admin override (any status to any status) uses the adminOverride endpoint directly
   * and is not governed by this method.
   */
  static canTransition(
    from: OrderStatus,
    to: OrderStatus,
    actor: VerificationActor,
  ): TransitionResult {
    const match = ALLOWED_TRANSITIONS.find(
      (t) => t.from === from && t.to === to && t.actors.includes(actor),
    );

    if (match) {
      return { allowed: true };
    }

    const allowedTargets = ALLOWED_TRANSITIONS
      .filter((t) => t.from === from && t.actors.includes(actor))
      .map((t) => t.to);

    const actorCanTransitionFrom = ALLOWED_TRANSITIONS.some(
      (t) => t.from === from && t.actors.includes(actor),
    );

    if (!actorCanTransitionFrom) {
      return {
        allowed: false,
        error: `Actor '${actor}' is not permitted to transition orders from status '${from}'`,
        allowedTransitions: [],
      };
    }

    return {
      allowed: false,
      error: `Cannot transition order from '${from}' to '${to}' for actor '${actor}'. Allowed targets: ${allowedTargets.join(', ')}`,
      allowedTransitions: allowedTargets,
    };
  }

  /**
   * Return all statuses this actor can transition to from the given status.
   */
  static getAllowedTransitions(from: OrderStatus, actor?: VerificationActor): OrderStatus[] {
    return ALLOWED_TRANSITIONS
      .filter((t) => t.from === from && (actor === undefined || t.actors.includes(actor)))
      .map((t) => t.to);
  }

  /**
   * Check whether a status is a terminal state (no further transitions possible).
   */
  static isTerminal(status: OrderStatus): boolean {
    return [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.SELLER_DECLINED,
    ].includes(status);
  }
}
