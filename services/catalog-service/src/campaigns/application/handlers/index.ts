/**
 * Application Handlers Index
 */

export interface CampaignEvent {
    readonly eventType: string;
}

export type CampaignHandlerContext = Record<string, unknown>;

export interface EventHandler<TEvent extends CampaignEvent = CampaignEvent, TContext = CampaignHandlerContext> {
    readonly eventType: string;
    handle(event: TEvent, context?: TContext): Promise<void>;
}

function isCampaignEvent(value: unknown): value is CampaignEvent {
    return typeof value === 'object' && value !== null && 'eventType' in value && typeof (value as { eventType?: unknown }).eventType === 'string';
}

export abstract class BaseEventHandler<TEvent extends CampaignEvent = CampaignEvent, TContext = CampaignHandlerContext> implements EventHandler<TEvent, TContext> {
    abstract readonly eventType: string;

    abstract handle(event: TEvent, context?: TContext): Promise<void>;

    protected validateEvent(event: unknown): asserts event is TEvent {
        if (!isCampaignEvent(event)) {
            throw new Error('Invalid event structure');
        }

        if (event.eventType !== this.eventType) {
            throw new Error(`Event type mismatch: expected ${this.eventType}, got ${event.eventType}`);
        }
    }

    protected logEventProcessing(event: TEvent, action: string): void {
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

    async handleEvent(event: unknown, context?: CampaignHandlerContext): Promise<void> {
        if (!isCampaignEvent(event)) {
            throw new Error('Invalid event structure');
        }

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
