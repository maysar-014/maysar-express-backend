/**
 * Domain Events for Business Registry Service
 * Defines all domain events that can be raised by the Business aggregate
 */

import { BusinessType, BusinessStatus, VerificationStatus, ComplianceStatus } from '../types/business.types';

/**
 * Base domain event interface
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventVersion: number;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Business Registered Event
 */
export class BusinessRegisteredEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BusinessRegistered';
  readonly aggregateType = 'Business';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(
    public readonly aggregateId: string,
    public readonly ownerId: string,
    public readonly businessType: BusinessType,
    public readonly registrationNumber: string,
    metadata?: Record<string, unknown>
  ) {
    this.eventId = `business-registered-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

/**
 * Business Verified Event
 */
export class BusinessVerifiedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BusinessVerified';
  readonly aggregateType = 'Business';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(
    public readonly aggregateId: string,
    public readonly verifiedBy: string,
    public readonly ownerId: string,
    metadata?: Record<string, unknown>
  ) {
    this.eventId = `business-verified-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

/**
 * Business Suspended Event
 */
export class BusinessSuspendedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BusinessSuspended';
  readonly aggregateType = 'Business';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(
    public readonly aggregateId: string,
    public readonly suspendedBy: string,
    public readonly reason?: string,
    metadata?: Record<string, unknown>
  ) {
    this.eventId = `business-suspended-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

/**
 * Business Reactivated Event
 */
export class BusinessReactivatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BusinessReactivated';
  readonly aggregateType = 'Business';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(
    public readonly aggregateId: string,
    public readonly reactivatedBy: string,
    metadata?: Record<string, unknown>
  ) {
    this.eventId = `business-reactivated-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

/**
 * Business Updated Event
 */
export class BusinessUpdatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'BusinessUpdated';
  readonly aggregateType = 'Business';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(
    public readonly aggregateId: string,
    public readonly updatedBy: string,
    public readonly changes: string[],
    metadata?: Record<string, unknown>
  ) {
    this.eventId = `business-updated-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}

/**
 * Compliance Status Changed Event
 */
export class ComplianceStatusChangedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'ComplianceStatusChanged';
  readonly aggregateType = 'Business';
  readonly eventVersion = 1;
  readonly occurredAt: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(
    public readonly aggregateId: string,
    public readonly oldStatus: ComplianceStatus,
    public readonly newStatus: ComplianceStatus,
    public readonly businessId: string,
    metadata?: Record<string, unknown>
  ) {
    this.eventId = `compliance-status-changed-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
    this.metadata = metadata;
  }
}
