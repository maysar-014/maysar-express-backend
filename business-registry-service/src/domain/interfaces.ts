/**
 * Domain Interfaces
 * Common interfaces used across the Business Registry Service domain
 */

/**
 * Base entity interface
 */
export interface Entity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Value object interface
 */
export interface ValueObject<T> {
  readonly value: T;
  equals(other: ValueObject<T>): boolean;
  isValid(): boolean;
  toString(): string;
}

/**
 * Domain service interface
 */
export interface DomainService {
  readonly name: string;
}

/**
 * Repository interface for entities
 */
export interface Repository<T extends Entity> {
  findById(id: string): Promise<T | null>;
  findByCriteria(criteria: Partial<T>): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
  count(criteria?: Partial<T>): Promise<number>;
}

/**
 * Domain event interface
 */
export interface DomainEvent {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly data: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}
