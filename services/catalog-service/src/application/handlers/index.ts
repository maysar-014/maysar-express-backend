/**
 * Application Handlers Index
 * Application event handlers and command handlers
 * Processes domain events and external commands
 */

// Export handlers as they are implemented
// This file serves as the entry point for application handlers

export interface EventHandler {
  readonly eventType: string;
  handle(event: any, context?: any): Promise<void>;
}

export interface CommandHandler {
  readonly commandType: string;
  handle(command: any, context?: any): Promise<any>;
}

/**
 * Base Event Handler
 * Provides common functionality for event handlers
 */
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

/**
 * Base Command Handler
 * Provides common functionality for command handlers
 */
export abstract class BaseCommandHandler implements CommandHandler {
  abstract readonly commandType: string;

  abstract handle(command: any, context?: any): Promise<any>;

  protected validateCommand(command: any): void {
    if (!command || !command.type) {
      throw new Error('Invalid command structure');
    }

    if (command.type !== this.commandType) {
      throw new Error(`Command type mismatch: expected ${this.commandType}, got ${command.type}`);
    }
  }

  protected createCommandResult(success: boolean, data?: any, error?: string): any {
    return {
      success,
      data,
      error,
      commandType: this.commandType,
      timestamp: new Date()
    };
  }
}

/**
 * Event Handler Registry
 * Manages event handler registrations and routing
 */
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
      console.warn(`No handlers registered for event type: ${eventType}`);
      return;
    }

    // Handle event with all registered handlers
    const promises = handlers.map(handler => handler.handle(event, context));
    await Promise.all(promises);
  }

  getHandlers(eventType: string): EventHandler[] {
    return this.handlers.get(eventType) || [];
  }

  getAllEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Command Handler Registry
 * Manages command handler registrations and routing
 */
export class CommandHandlerRegistry {
  private handlers: Map<string, CommandHandler> = new Map();

  register(handler: CommandHandler): void {
    const commandType = handler.commandType;
    if (this.handlers.has(commandType)) {
      throw new Error(`Command handler already registered for type: ${commandType}`);
    }
    this.handlers.set(commandType, handler);
  }

  async handleCommand(command: any, context?: any): Promise<any> {
    const commandType = command.type;
    const handler = this.handlers.get(commandType);

    if (!handler) {
      throw new Error(`No handler registered for command type: ${commandType}`);
    }

    return await handler.handle(command, context);
  }

  getHandler(commandType: string): CommandHandler | undefined {
    return this.handlers.get(commandType);
  }

  getAllCommandTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Global registries
export const eventHandlerRegistry = new EventHandlerRegistry();
export const commandHandlerRegistry = new CommandHandlerRegistry();
