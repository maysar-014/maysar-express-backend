// Re-export from canonical event catalog
export * from '../../events';

// Legacy compatibility - will be deprecated
import { UUID, Money, UserRole, OrderStatus, PaymentStatus } from '../types';
import type { EventPayload as NewEventPayload } from '../../events';

// @deprecated - Use types from ../../events instead
export type EventPayload = NewEventPayload;
