// Re-export from canonical event catalog
export * from '../../events';

// Legacy compatibility - will be deprecated
import type { EventPayload as NewEventPayload } from '../../events';

// @deprecated - Use types from ../../events instead
export type EventPayload = NewEventPayload;
