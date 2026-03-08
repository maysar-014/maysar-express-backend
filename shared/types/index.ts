import type { Prisma } from '@prisma/client';

export * from '@prisma/client';

export type PrismaTransaction = Prisma.TransactionClient;

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventEnvelope<
  TData = unknown,
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  eventId?: string;
  eventType?: string;
  data?: TData;
  type?: string;
  event?: string;
  payload?: TData;
  eventData?: TData;
  aggregateId?: string;
  aggregateType?: string;
  sagaId?: string;
  metadata?: TMetadata;
  timestamp?: Date | string;
  correlationId?: string;
}

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface IUseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}

export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class DomainError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export interface SagaStep<T> {
  name: string;
  execute: (context: T) => Promise<void>;
  compensate: (context: T) => Promise<void>;
}

export type EventHandler<TEnvelope = EventEnvelope> = (envelope: TEnvelope) => Promise<void>;

export interface SubscriptionOptions<TEnvelope = EventEnvelope> {
  name: string;
  handler: EventHandler<TEnvelope>;
}

export interface IEventBus {
  publish(envelope: EventEnvelope): Promise<void>;
  publish(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
  emit(envelope: EventEnvelope): Promise<void>;
  emit(eventType: string, data: unknown, metadata?: Record<string, unknown>): Promise<void>;
  subscribe<TEnvelope = EventEnvelope>(eventType: string, handler: EventHandler<TEnvelope>): Promise<void>;
  subscribe<TEnvelope = EventEnvelope>(
    eventType: string,
    options: SubscriptionOptions<TEnvelope>
  ): Promise<void>;
}

export interface ILogger {
  info(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, { status: 'up' | 'down'; message?: string }>;
  timestamp: Date;
}
