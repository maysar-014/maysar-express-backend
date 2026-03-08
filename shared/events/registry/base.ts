import { EventMetadata } from '../metadata';

/**
 * Base interface for all event schemas
 */
export interface EventSchema<T = unknown> {
    eventType: string;
    version: string;
    payloadType?: T;
    validate(data: unknown): { valid: boolean; errors?: string[] };
}

/**
 * Shared Event Envelope using standardized metadata
 */
export interface SharedEventEnvelope<T = unknown> {
    metadata: EventMetadata;
    payload: T;
}

/**
 * Simple Registry to manage schemas
 */
export class EventSchemaRegistry {
    private schemas: Map<string, EventSchema<unknown>> = new Map();

    register<T>(schema: EventSchema<T>): void {
        const key = `${schema.eventType}:${schema.version}`;
        this.schemas.set(key, schema as EventSchema<unknown>);
    }

    getSchema(eventType: string, version: string = 'v1'): EventSchema<unknown> | undefined {
        return this.schemas.get(`${eventType}:${version}`);
    }

    validate(eventType: string, data: unknown, version: string = 'v1'): { valid: boolean; errors?: string[] } {
        const schema = this.getSchema(eventType, version);
        if (!schema) {
            return { valid: true }; // Opt-in validation: if no schema, assume valid for now
        }
        return schema.validate(data);
    }
}

export const eventRegistry = new EventSchemaRegistry();
