
export interface IEventBus {
    publish(event: any): Promise<void>;
    subscribe(eventType: string, handler: (event: any) => Promise<void>): void;
}
