/**
 * Domain Interfaces
 * Common interfaces used across the Notification Service domain
 */

export interface Entity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ValueObject<T> {
  readonly value: T;
  equals(other: ValueObject<T>): boolean;
  isValid(): boolean;
  toString(): string;
}

export interface DomainService {
  readonly name: string;
}

export interface DomainPolicy {
  readonly name: string;
  evaluate(...args: any[]): boolean | Promise<boolean>;
}
