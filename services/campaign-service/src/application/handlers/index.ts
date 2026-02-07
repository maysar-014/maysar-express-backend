/**
 * Application Handlers Index
 */

export interface EventHandler {
    readonly eventType: string;
    handle(event: any, context?: any): Promise<void>;
}

export abstract class BaseEventHandler implements EventHandler {
    abstract readonly eventType: string;

    abstract handle(event: any, context?: any): Promise<void>;

    protected validateEvent(event: any): void {
        if (!event || !event.eventType) {
            throw new Error('Invalid event structure');
        }

        if (event.eventType !== this.eventType) {
            throw new Error(`Event type mismatch: expected ${this.eventType}, got ${event.eventType}`);
        }
    }

    protected logEventProcessing(event: any, action: string): void {
        console.log(`[${this.constructor.name}] Processing ${event.eventType}: ${action}`);
    }
}

export class EventHandlerRegistry {
    private handlers: Map<string, EventHandler[]> = new Map();

    register(handler: EventHandler): void {
        const eventType = handler.eventType;
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);
    }

    async handleEvent(event: any, context?: any): Promise<void> {
        const eventType = event.eventType;
        const handlers = this.handlers.get(eventType) || [];

        if (handlers.length === 0) {
            return;
        }

        const promises = handlers.map(handler => handler.handle(event, context));
        await Promise.all(promises);
    }
}

export const eventHandlerRegistry = new EventHandlerRegistry();
