import { EventMetadata } from '../metadata';

/**
 * Base interface for all event schemas
 */
export interface EventSchema<T = any> {
    eventType: string;
    version: string;
    validate(data: T): { valid: boolean; errors?: string[] };
}

/**
 * Shared Event Envelope using standardized metadata
 */
export interface SharedEventEnvelope<T = any> {
    metadata: EventMetadata;
    payload: T;
}

/**
 * Simple Registry to manage schemas
 */
export class EventSchemaRegistry {
    private schemas: Map<string, EventSchema> = new Map();

    register(schema: EventSchema): void {
        const key = `${schema.eventType}:${schema.version}`;
        this.schemas.set(key, schema);
    }

    getSchema(eventType: string, version: string = 'v1'): EventSchema | undefined {
        return this.schemas.get(`${eventType}:${version}`);
    }

    validate(eventType: string, data: any, version: string = 'v1'): { valid: boolean; errors?: string[] } {
        const schema = this.getSchema(eventType, version);
        if (!schema) {
            return { valid: true }; // Opt-in validation: if no schema, assume valid for now
        }
        return schema.validate(data);
    }
}

export const eventRegistry = new EventSchemaRegistry();
