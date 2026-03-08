import { v4 as uuidv4 } from 'uuid';

/**
 * Mandatory Event Metadata as per Integration Constitution
 */
export interface EventMetadata {
    /** X-Correlation-ID: Unified ID for tracing a request across the entire system */
    correlationId: string;

    /** X-Request-ID: Unique ID for the specific event instance */
    requestId: string;

    /** X-User-ID: (When applicable) The authenticated user context */
    userId?: string;

    /** Source service that produced the event */
    source: string;

    /** Event timestamp in ISO format */
    timestamp: string;

    /** Event schema version */
    version: string;

    /** Idempotency key for deduplication */
    idempotencyKey?: string;
}

/**
 * Utility to create standard metadata
 */
export const createEventMetadata = (
    source: string,
    context?: Partial<EventMetadata>
): EventMetadata => {
    return {
        correlationId: context?.correlationId || uuidv4(),
        requestId: uuidv4(),
        userId: context?.userId,
        source,
        timestamp: new Date().toISOString(),
        version: context?.version || 'v1',
        idempotencyKey: context?.idempotencyKey
    };
};

/**
 * Headers mapping for Metadata
 */
export const metadataToHeaders = (metadata: EventMetadata): Record<string, string> => {
    const headers: Record<string, string> = {
        'X-Correlation-ID': metadata.correlationId,
        'X-Request-ID': metadata.requestId,
        'source': metadata.source,
        'version': metadata.version,
        'timestamp': metadata.timestamp
    };

    if (metadata.userId) {
        headers['X-User-ID'] = metadata.userId;
    }

    return headers;
};
