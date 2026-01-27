/**
 * Domain Interfaces
 * Common interfaces used across the User Service domain
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
 * Read repository interface for queries
 */
export interface ReadRepository<T> {
  findById(id: string): Promise<T | null>;
  findByCriteria(criteria: Partial<T>): Promise<T[]>;
  findAll(limit?: number, offset?: number): Promise<T[]>;
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
  readonly data: Record<string, any>;
  readonly metadata?: Record<string, any>;
}

/**
 * Domain event handler interface
 */
export interface DomainEventHandler<T extends DomainEvent> {
  readonly eventType: string;
  handle(event: T): Promise<void>;
}

/**
 * Domain policy interface
 */
export interface DomainPolicy {
  readonly name: string;
  evaluate(...args: any[]): boolean | Promise<boolean>;
}

/**
 * Domain specification interface
 */
export interface DomainSpecification<T> {
  isSatisfiedBy(candidate: T): boolean | Promise<boolean>;
  and(other: DomainSpecification<T>): DomainSpecification<T>;
  or(other: DomainSpecification<T>): DomainSpecification<T>;
  not(): DomainSpecification<T>;
}

/**
 * Domain factory interface
 */
export interface DomainFactory<T> {
  create(props: any): T;
  createFromExisting(props: any): T;
}

/**
 * Domain validator interface
 */
export interface DomainValidator<T> {
  validate(entity: T): { isValid: boolean; errors: string[] };
}

/**
 * Domain mapper interface
 */
export interface DomainMapper<TDomain, TDto> {
  toDomain(dto: TDto): TDomain;
  toDto(domain: TDomain): TDto;
  toDomainList(dtos: TDto[]): TDomain[];
  toDtoList(domains: TDomain[]): TDto[];
}

/**
 * Domain use case interface
 */
export interface DomainUseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}

/**
 * Domain saga interface
 */
export interface DomainSaga {
  readonly name: string;
  handle(event: DomainEvent): Promise<void>;
}

/**
 * Domain command interface
 */
export interface DomainCommand {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly data: Record<string, any>;
  readonly metadata?: Record<string, any>;
}

/**
 * Domain query interface
 */
export interface DomainQuery {
  readonly id: string;
  readonly type: string;
  readonly data: Record<string, any>;
  readonly metadata?: Record<string, any>;
}

/**
 * Domain exception interface
 */
export interface DomainException {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, any>;
  readonly timestamp: Date;
}

/**
 * Domain result interface
 */
export interface DomainResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: DomainException;
  readonly warnings?: string[];
}

/**
 * Domain aggregate root interface
 */
export interface AggregateRoot extends Entity {
  readonly version: number;
  readonly events: DomainEvent[];
  clearEvents(): void;
  applyEvent(event: DomainEvent): void;
}

/**
 * Domain repository for aggregate roots
 */
export interface AggregateRepository<T extends AggregateRoot> extends Repository<T> {
  save(aggregate: T): Promise<void>;
  findByIdWithEvents(id: string): Promise<T | null>;
  findByVersion(id: string, version: number): Promise<T | null>;
}