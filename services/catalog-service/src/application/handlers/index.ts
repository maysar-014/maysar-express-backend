/**
 * Application Handlers Index
 * Application event handlers and command handlers
 * Processes domain events and external commands
 */

// Export handlers as they are implemented
// This file serves as the entry point for application handlers

export interface ApplicationEvent {
  readonly eventType: string;
}

export interface ApplicationCommand {
  readonly type: string;
}

export type HandlerContext = Record<string, unknown>;

export interface CommandResult<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: string;
  commandType: string;
  timestamp: Date;
}

export interface EventHandler<TEvent extends ApplicationEvent = ApplicationEvent, TContext = HandlerContext> {
  readonly eventType: string;
  handle(event: TEvent, context?: TContext): Promise<void>;
}

export interface CommandHandler<
  TCommand extends ApplicationCommand = ApplicationCommand,
  TResult = unknown,
  TContext = HandlerContext
> {
  readonly commandType: string;
  handle(command: TCommand, context?: TContext): Promise<TResult>;
}

function isApplicationEvent(value: unknown): value is ApplicationEvent {
  return typeof value === 'object' && value !== null && 'eventType' in value && typeof (value as { eventType?: unknown }).eventType === 'string';
}

function isApplicationCommand(value: unknown): value is ApplicationCommand {
  return typeof value === 'object' && value !== null && 'type' in value && typeof (value as { type?: unknown }).type === 'string';
}

/**
 * Base Event Handler
 * Provides common functionality for event handlers
 */
export abstract class BaseEventHandler<TEvent extends ApplicationEvent = ApplicationEvent, TContext = HandlerContext> implements EventHandler<TEvent, TContext> {
  abstract readonly eventType: string;

  abstract handle(event: TEvent, context?: TContext): Promise<void>;

  protected validateEvent(event: unknown): asserts event is TEvent {
    if (!isApplicationEvent(event)) {
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

/**
 * Base Command Handler
 * Provides common functionality for command handlers
 */
export abstract class BaseCommandHandler<
  TCommand extends ApplicationCommand = ApplicationCommand,
  TResult = unknown,
  TContext = HandlerContext
> implements CommandHandler<TCommand, TResult, TContext> {
  abstract readonly commandType: string;

  abstract handle(command: TCommand, context?: TContext): Promise<TResult>;

  protected validateCommand(command: unknown): asserts command is TCommand {
    if (!isApplicationCommand(command)) {
      throw new Error('Invalid command structure');
    }

    if (command.type !== this.commandType) {
      throw new Error(`Command type mismatch: expected ${this.commandType}, got ${command.type}`);
    }
  }

  protected createCommandResult<TData>(success: boolean, data?: TData, error?: string): CommandResult<TData> {
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

  async handleEvent(event: unknown, context?: HandlerContext): Promise<void> {
    if (!isApplicationEvent(event)) {
      throw new Error('Invalid event structure');
    }

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

  async handleCommand(command: unknown, context?: HandlerContext): Promise<unknown> {
    if (!isApplicationCommand(command)) {
      throw new Error('Invalid command structure');
    }

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
