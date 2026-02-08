export interface IEventBus {
    publish(eventType: string, data: any, metadata?: any): Promise<void>;
    subscribe(eventType: string, handler: (envelope: any) => Promise<void>): Promise<void>;
}
