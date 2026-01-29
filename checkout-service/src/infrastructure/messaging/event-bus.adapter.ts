export interface IEventBus {
  publish(eventType: string, data: any): Promise<void>;
  subscribe(eventType: string, handler: (data: any) => Promise<void>): void;
}

export class EventBusAdapter implements IEventBus {
  private subscribers: Map<string, Array<(data: any) => Promise<void>>> = new Map();

  async publish(eventType: string, data: any): Promise<void> {
    const handlers = this.subscribers.get(eventType) || [];
    
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    }
  }

  subscribe(eventType: string, handler: (data: any) => Promise<void>): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }
}
