// Maysar Event Catalog - Main Export
export { eventSchemaRegistry, EventSchemaRegistry } from './schemaRegistry';
export * from './types';
export { EventSchemaValidator } from './validate';

// Re-export commonly used types
export type {
  EventEnvelope,
  EventPayload,
  OrderCreatedPayload,
  PaymentSucceededPayload,
  InventoryReservedPayload,
  SellerKycApprovedPayload
} from './types';

// Version information
export const EVENT_CATALOG_VERSION = '1.0.0';
export const SUPPORTED_EVENT_VERSIONS = ['v1'];

// Validation utilities
export function validateEventEnvelope<T>(envelope: any): envelope is EventEnvelope<T> {
  return (
    typeof envelope === 'object' &&
    typeof envelope.eventId === 'string' &&
    typeof envelope.eventType === 'string' &&
    typeof envelope.timestamp === 'string' &&
    typeof envelope.correlationId === 'string' &&
    typeof envelope.producer === 'string' &&
    typeof envelope.version === 'string' &&
    envelope.payload !== undefined
  );
}

export function isValidEventType(eventType: string): boolean {
  const pattern = /^[a-z]+\.[a-z_]+\.v\d+$/;
  return pattern.test(eventType);
}