/**
 * Application Sagas Index
 * Complete saga orchestration system for complex business workflows
 * Includes saga implementations, event handlers, and coordination
 */

// Core Saga Interfaces and Base Classes
export interface Saga<TContext extends Record<string, unknown> = Record<string, unknown>, TState extends Record<string, unknown> = Record<string, unknown>> {
  readonly sagaId: string;
  readonly sagaType: string;
  start(context: TContext): Promise<void>;
  handleEvent(event: unknown): Promise<void>;
  getState(): TState;
  isCompleted(): boolean;
  compensate(): Promise<void>;
}

/**
 * Base Saga Implementation
 * Provides common saga orchestration functionality
 */
export abstract class BaseSaga<TContext extends Record<string, unknown> = Record<string, unknown>, TState extends Record<string, unknown> = Record<string, unknown>> implements Saga<TContext, TState> {
  abstract readonly sagaId: string;
  abstract readonly sagaType: string;

  protected state: TState = {} as TState;
  protected steps: Array<{
    id: string;
    operation: () => Promise<unknown>;
    compensation: () => Promise<void>;
    completed: boolean;
    compensated: boolean;
  }> = [];

  async start(context: TContext): Promise<void> {
    this.initializeState(context);
    await this.executeNextStep();
  }

  async handleEvent(event: unknown): Promise<void> {
    // Handle external events that might affect saga progress
    await this.processEvent(event);
  }

  getState(): TState {
    return { ...this.state } as TState;
  }

  isCompleted(): boolean {
    return this.steps.every(step => step.completed);
  }

  async compensate(): Promise<void> {
    // Compensate in reverse order
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];
      if (step.completed && !step.compensated) {
        await step.compensation();
        step.compensated = true;
      }
    }
  }

  protected abstract initializeState(context: TContext): void;
  protected abstract executeNextStep(): Promise<void>;
  protected abstract processEvent(event: unknown): Promise<void>;

  protected addStep(id: string, operation: () => Promise<unknown>, compensation: () => Promise<void>): void {
    this.steps.push({
      id,
      operation,
      compensation,
      completed: false,
      compensated: false
    });
  }

  protected markStepCompleted(stepId: string): void {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.completed = true;
    }
  }
}

// Saga Implementations
export * from './product-publishing.saga';
export * from './bulk-product-update.saga';
export * from './pricing-update.saga';
export * from './pricing-update.saga';

// Event Handlers for Saga Coordination
export * from './product-inventory-event-handlers';

// Saga Manager for Coordination
export * from './saga-manager';

// Saga Factory for Creation
export * from './saga-factory';

/**
 * Saga Orchestration System Overview
 *
 * This module provides a complete saga orchestration system with:
 *
 * 1. Base Saga Framework:
 *    - BaseSaga: Abstract base class for all sagas
 *    - Saga interface: Contract for saga implementations
 *    - Step management: Add, execute, and compensate steps
 *
 * 2. Saga Implementations:
 *    - ProductPublishingSaga: Orchestrates product publishing workflow
 *    - BulkProductUpdateSaga: Handles bulk product updates with rollback
 *
 * 3. Event-Driven Coordination:
 *    - ProductInventoryEventHandlers: Handle inventory service events
 *    - SagaManager: Coordinates multiple sagas and event routing
 *    - Event correlation: Links events back to specific saga instances
 *
 * 4. Key Features:
 *    - Compensation: Automatic rollback on failures
 *    - Event correlation: Timeout-based event routing
 *    - State management: Saga instance tracking and persistence
 *    - Error recovery: Retry logic and failure handling
 *    - Monitoring: Saga statistics and health checks
 *
 * 5. Microservice Integration:
 *    - Event-driven communication between services
 *    - Asynchronous cross-service coordination
 *    - Loose coupling through domain events
 *    - Service boundary respect
 *
 * Usage:
 * ```typescript
 * // Start a product publishing saga
 * const sagaId = await sagaManager.startSaga(
 *   (context) => new ProductPublishingSaga(productRepo, categoryRepo, mediaRepo, searchService, eventPublisher, idGenerator, dateTimeService, context),
 *   { productId, sellerId, autoPublish: true, notifyFollowers: true, updateSearchIndex: true }
 * );
 *
 * // Register event handlers
 * eventHandlerRegistry.register(productInventoryVerifiedHandler(dependencies));
 * eventHandlerRegistry.register(productInventoryVerificationFailedHandler(dependencies));
 * ```
 */
