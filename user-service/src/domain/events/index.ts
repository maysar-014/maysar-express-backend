/**
 * Domain Events for User Service
 * Defines all domain events that can be raised by the User aggregate
 */

import { User, UserRole, UserStatus } from '../entities/user.entity';

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
  metadata?: Record<string, any>;
}

/**
 * User Registered Event
 * Raised when a new user account is created
 */
export class UserRegisteredEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserRegistered';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly email: string,
    public readonly role: UserRole,
    public readonly registrationMethod: 'email' | 'phone' | 'social',
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-registered-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Profile Updated Event
 * Raised when user profile information is changed
 */
export class UserProfileUpdatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserProfileUpdated';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly changes: string[], // fields that were changed
    public readonly oldValues: Record<string, any>,
    public readonly newValues: Record<string, any>,
    public readonly updatedBy: string, // userId of who made the change
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-profile-updated-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Email Verified Event
 * Raised when user email address is verified
 */
export class UserEmailVerifiedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserEmailVerified';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly email: string,
    public readonly verificationMethod: 'token' | 'admin',
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-email-verified-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Phone Verified Event
 * Raised when user phone number is verified
 */
export class UserPhoneVerifiedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserPhoneVerified';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly phoneNumber: string,
    public readonly carrier: string,
    public readonly verificationMethod: 'sms' | 'call' | 'admin',
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-phone-verified-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Status Changed Event
 * Raised when user account status is modified
 */
export class UserStatusChangedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserStatusChanged';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly oldStatus: UserStatus,
    public readonly newStatus: UserStatus,
    public readonly changedBy: string, // userId of who made the change
    public readonly reason?: string,
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-status-changed-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Role Changed Event
 * Raised when user role is modified
 */
export class UserRoleChangedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserRoleChanged';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly oldRole: UserRole,
    public readonly newRole: UserRole,
    public readonly changedBy: string, // userId of who made the change
    public readonly promotionReason?: string,
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-role-changed-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Password Changed Event
 * Raised when user password is updated
 */
export class UserPasswordChangedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserPasswordChanged';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly changedBy: string, // userId of who made the change (could be self)
    public readonly changeReason: 'user_initiated' | 'admin_reset' | 'security_policy',
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-password-changed-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Login Success Event
 * Raised when user successfully logs in
 */
export class UserLoginSuccessEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserLoginSuccess';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly loginMethod: 'password' | 'social' | 'sso',
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-login-success-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Login Failed Event
 * Raised when user login attempt fails
 */
export class UserLoginFailedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserLoginFailed';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly failureReason: 'invalid_password' | 'account_locked' | 'account_disabled',
    public readonly attemptCount: number,
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-login-failed-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Account Locked Event
 * Raised when user account becomes locked due to security policy
 */
export class UserAccountLockedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserAccountLocked';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly lockReason: 'failed_attempts' | 'admin_action' | 'suspicious_activity',
    public readonly lockDurationMinutes: number,
    public readonly failedAttemptCount: number,
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-account-locked-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Address Added Event
 * Raised when a new address is added to user account
 */
export class UserAddressAddedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserAddressAdded';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly addressId: string,
    public readonly addressType: 'home' | 'work' | 'billing' | 'shipping',
    public readonly isDefault: boolean,
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-address-added-${aggregateId}-${addressId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Preferences Updated Event
 * Raised when user preferences are modified
 */
export class UserPreferencesUpdatedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserPreferencesUpdated';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly changedPreferences: string[], // preference keys that changed
    public readonly oldPreferences: Record<string, any>,
    public readonly newPreferences: Record<string, any>,
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-preferences-updated-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * User Deleted Event
 * Raised when user account is permanently deleted
 */
export class UserDeletedEvent implements DomainEvent {
  readonly eventId: string;
  readonly eventType = 'UserDeleted';
  readonly aggregateType = 'User';
  readonly eventVersion = 1;
  readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string, // userId
    public readonly deletedBy: string, // userId of who performed deletion
    public readonly deletionReason: string,
    public readonly userData: {
      email: string;
      role: UserRole;
      status: UserStatus;
      registeredAt: Date;
      lastLoginAt?: Date;
    },
    public readonly metadata?: Record<string, any>
  ) {
    this.eventId = `user-deleted-${aggregateId}-${Date.now()}`;
    this.occurredAt = new Date();
  }
}

/**
 * Union type for all user domain events
 */
export type UserDomainEvent =
  | UserRegisteredEvent
  | UserProfileUpdatedEvent
  | UserEmailVerifiedEvent
  | UserPhoneVerifiedEvent
  | UserStatusChangedEvent
  | UserRoleChangedEvent
  | UserPasswordChangedEvent
  | UserLoginSuccessEvent
  | UserLoginFailedEvent
  | UserAccountLockedEvent
  | UserAddressAddedEvent
  | UserPreferencesUpdatedEvent
  | UserDeletedEvent;

/**
 * Domain Event Publisher Interface
 * Defines the contract for publishing domain events
 */
export interface IDomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

/**
 * Domain Event Handler Interface
 * Defines the contract for handling domain events
 */
export interface IDomainEventHandler<T extends DomainEvent> {
  eventType: string;
  handle(event: T): Promise<void>;
}
