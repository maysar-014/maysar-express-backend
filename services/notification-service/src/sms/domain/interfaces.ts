/**
 * Domain Interfaces
 * Core domain interface definitions
 */

export interface Entity {
    getId(): string;
    getCreatedAt(): Date;
    getUpdatedAt(): Date;
}

export interface ValueObject<T> {
    equals(other: T): boolean;
}

export interface AggregateRoot extends Entity {
    getDomainEvents(): any[];
    clearDomainEvents(): void;
}
