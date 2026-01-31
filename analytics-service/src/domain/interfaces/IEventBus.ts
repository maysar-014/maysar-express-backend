export interface IEventBus {
    publish(event: { type: string; data: any }): Promise<void>;
    subscribe(eventType: string, handler: (event: any) => Promise<void>): void;
}
