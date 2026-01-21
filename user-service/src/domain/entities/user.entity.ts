import { PasswordHash } from '../value-objects/password-hash.value-object';
import { Email } from '../value-objects/email.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';

/**
 * User roles in the marketplace ecosystem
 */
export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  COURIER = 'courier',
  ENABLER = 'enabler',
  SYSTEM = 'system'
}

/**
 * User account status
 */
export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  LOCKED = 'locked'
}

/**
 * User preferences for notifications and settings
 */
export interface UserPreferences {
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
}

/**
 * User entity - Core domain entity representing a user account
 * Enhanced for comprehensive user profile management
 */
export class User {
  private constructor(
    private readonly _id: string,
    private readonly _email: Email,
    private _passwordHash: PasswordHash,
    private _role: UserRole,
    private _status: UserStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,

    // Profile Information
    private _firstName?: string,
    private _lastName?: string,
    private _phoneNumber?: PhoneNumber,
    private _dateOfBirth?: Date,
    private _avatar?: string,

    // Verification Status
    private _isEmailVerified: boolean = false,
    private _isPhoneVerified: boolean = false,
    private _emailVerifiedAt?: Date,
    private _phoneVerifiedAt?: Date,

    // Security Tracking
    private _failedLoginAttempts: number = 0,
    private _lockoutUntil?: Date,
    private _lastLoginAt?: Date,
    private _passwordChangedAt?: Date,

    // Two-Factor Authentication
    private _twoFactorEnabled: boolean = false,
    private _twoFactorSecret?: string,

    // Preferences
    private _language: string = 'en',
    private _timezone: string = 'UTC',
    private _notificationsEnabled: boolean = true,

    // Metadata
    private _attributes?: Record<string, any>
  ) {}

  // Getters
  get id(): string { return this._id; }
  get email(): Email { return this._email; }
  get passwordHash(): PasswordHash { return this._passwordHash; }
  get role(): UserRole { return this._role; }
  get status(): UserStatus { return this._status; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // Profile getters
  get firstName(): string | undefined { return this._firstName; }
  get lastName(): string | undefined { return this._lastName; }
  get fullName(): string {
    const parts = [this._firstName, this._lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '';
  }
  get phoneNumber(): PhoneNumber | undefined { return this._phoneNumber; }
  get dateOfBirth(): Date | undefined { return this._dateOfBirth; }
  get avatar(): string | undefined { return this._avatar; }

  // Verification getters
  get isEmailVerified(): boolean { return this._isEmailVerified; }
  get isPhoneVerified(): boolean { return this._isPhoneVerified; }
  get emailVerifiedAt(): Date | undefined { return this._emailVerifiedAt; }
  get phoneVerifiedAt(): Date | undefined { return this._phoneVerifiedAt; }

  // Security getters
  get failedLoginAttempts(): number { return this._failedLoginAttempts; }
  get lockoutUntil(): Date | undefined { return this._lockoutUntil; }
  get lastLoginAt(): Date | undefined { return this._lastLoginAt; }
  get passwordChangedAt(): Date | undefined { return this._passwordChangedAt; }

  // 2FA getters
  get twoFactorEnabled(): boolean { return this._twoFactorEnabled; }
  get twoFactorSecret(): string | undefined { return this._twoFactorSecret; }

  // Preferences getters
  get language(): string { return this._language; }
  get timezone(): string { return this._timezone; }
  get notificationsEnabled(): boolean { return this._notificationsEnabled; }
  get preferences(): UserPreferences {
    return {
      language: this._language,
      timezone: this._timezone,
      notificationsEnabled: this._notificationsEnabled
    };
  }

  // Metadata getter
  get attributes(): Record<string, any> | undefined { return this._attributes; }

  // Factory methods
  static create(props: {
    id: string;
    email: Email;
    passwordHash: PasswordHash;
    role: UserRole;
    firstName?: string;
    lastName?: string;
  }): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.role,
      UserStatus.PENDING_VERIFICATION,
      new Date(),
      new Date(),
      props.firstName,
      props.lastName
    );
  }

  static reconstitute(props: {
    id: string;
    email: Email;
    passwordHash: PasswordHash;
    role: UserRole;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    firstName?: string;
    lastName?: string;
    phoneNumber?: PhoneNumber;
    dateOfBirth?: Date;
    avatar?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    emailVerifiedAt?: Date;
    phoneVerifiedAt?: Date;
    failedLoginAttempts?: number;
    lockoutUntil?: Date;
    lastLoginAt?: Date;
    passwordChangedAt?: Date;
    twoFactorEnabled?: boolean;
    twoFactorSecret?: string;
    language?: string;
    timezone?: string;
    notificationsEnabled?: boolean;
    attributes?: Record<string, any>;
  }): User {
    return new User(
      props.id,
      props.email,
      props.passwordHash,
      props.role,
      props.status,
      props.createdAt,
      props.updatedAt,
      props.firstName,
      props.lastName,
      props.phoneNumber,
      props.dateOfBirth,
      props.avatar,
      props.isEmailVerified,
      props.isPhoneVerified,
      props.emailVerifiedAt,
      props.phoneVerifiedAt,
      props.failedLoginAttempts,
      props.lockoutUntil,
      props.lastLoginAt,
      props.passwordChangedAt,
      props.twoFactorEnabled,
      props.twoFactorSecret,
      props.language,
      props.timezone,
      props.notificationsEnabled,
      props.attributes
    );
  }

  // Business methods

  /**
   * Updates user profile information
   */
  updateProfile(profile: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    avatar?: string;
  }): void {
    if (profile.firstName !== undefined) this._firstName = profile.firstName;
    if (profile.lastName !== undefined) this._lastName = profile.lastName;
    if (profile.dateOfBirth !== undefined) this._dateOfBirth = profile.dateOfBirth;
    if (profile.avatar !== undefined) this._avatar = profile.avatar;
    this._updatedAt = new Date();
  }

  /**
   * Verifies user email
   */
  verifyEmail(): void {
    if (this._status === UserStatus.PENDING_VERIFICATION) {
      this._status = UserStatus.ACTIVE;
    }
    this._isEmailVerified = true;
    this._emailVerifiedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Updates phone number
   */
  updatePhoneNumber(phoneNumber: PhoneNumber): void {
    this._phoneNumber = phoneNumber;
    this._isPhoneVerified = false; // Reset verification
    this._phoneVerifiedAt = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Verifies phone number
   */
  verifyPhone(): void {
    if (this._phoneNumber) {
      this._isPhoneVerified = true;
      this._phoneVerifiedAt = new Date();
      this._updatedAt = new Date();
    }
  }

  /**
   * Changes user password
   */
  changePassword(newPasswordHash: PasswordHash): void {
    this._passwordHash = newPasswordHash;
    this._passwordChangedAt = new Date();
    this._updatedAt = new Date();
    this._failedLoginAttempts = 0; // Reset failed attempts
    this._lockoutUntil = undefined; // Remove lockout
  }

  /**
   * Records successful login
   */
  recordSuccessfulLogin(): void {
    this._lastLoginAt = new Date();
    this._failedLoginAttempts = 0;
    this._lockoutUntil = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Records failed login attempt
   */
  recordFailedLogin(): void {
    this._failedLoginAttempts += 1;
    this._updatedAt = new Date();

    // Lock account after 5 failed attempts
    if (this._failedLoginAttempts >= 5) {
      this._status = UserStatus.LOCKED;
      this._lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  /**
   * Updates user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    if (preferences.language !== undefined) this._language = preferences.language;
    if (preferences.timezone !== undefined) this._timezone = preferences.timezone;
    if (preferences.notificationsEnabled !== undefined) this._notificationsEnabled = preferences.notificationsEnabled;
    this._updatedAt = new Date();
  }

  /**
   * Checks if account is currently locked
   */
  isLocked(): boolean {
    if (this._status === UserStatus.LOCKED && this._lockoutUntil) {
      return this._lockoutUntil > new Date();
    }
    return this._status === UserStatus.LOCKED;
  }

  /**
   * Unlocks account (admin action)
   */
  unlock(): void {
    if (this._status === UserStatus.LOCKED) {
      this._status = UserStatus.ACTIVE;
      this._failedLoginAttempts = 0;
      this._lockoutUntil = undefined;
      this._updatedAt = new Date();
    }
  }

  /**
   * Suspends user account
   */
  suspend(): void {
    this._status = UserStatus.SUSPENDED;
    this._updatedAt = new Date();
  }

  /**
   * Reactivates suspended account
   */
  reactivate(): void {
    if (this._status === UserStatus.SUSPENDED) {
      this._status = UserStatus.ACTIVE;
      this._updatedAt = new Date();
    }
  }

  /**
   * Deactivates user account
   */
  deactivate(): void {
    this._status = UserStatus.DEACTIVATED;
    this._updatedAt = new Date();
  }

  /**
   * Enables two-factor authentication
   */
  enableTwoFactor(secret: string): void {
    this._twoFactorEnabled = true;
    this._twoFactorSecret = secret;
    this._updatedAt = new Date();
  }

  /**
   * Disables two-factor authentication
   */
  disableTwoFactor(): void {
    this._twoFactorEnabled = false;
    this._twoFactorSecret = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Changes user role (admin action)
   */
  changeRole(newRole: UserRole): void {
    this._role = newRole;
    this._updatedAt = new Date();
  }

  /**
   * Updates user attributes/metadata
   */
  updateAttributes(attributes: Record<string, any>): void {
    this._attributes = { ...this._attributes, ...attributes };
    this._updatedAt = new Date();
  }

  /**
   * Business rules
   */

  /**
   * Can user authenticate?
   */
  canAuthenticate(): boolean {
    return this._status === UserStatus.ACTIVE && !this.isLocked();
  }

  /**
   * Can user change password?
   */
  canChangePassword(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  /**
   * Requires two-factor authentication?
   */
  requiresTwoFactor(): boolean {
    return this._twoFactorEnabled;
  }

  /**
   * Is account verified?
   */
  isVerified(): boolean {
    return this._isEmailVerified || this._isPhoneVerified;
  }

  /**
   * Can user access system features?
   */
  canAccessSystem(): boolean {
    return this._status === UserStatus.ACTIVE && this.isVerified();
  }

  /**
   * Is user profile complete?
   */
  isProfileComplete(): boolean {
    return !!(this._firstName && this._lastName && this._phoneNumber && this._isEmailVerified);
  }

  /**
   * Can user receive notifications?
   */
  canReceiveNotifications(): boolean {
    return this._notificationsEnabled && this._status === UserStatus.ACTIVE;
  }

  // Serialization for DTOs (not domain entities)
  toJSON() {
    return {
      id: this._id,
      email: this._email.toString(),
      firstName: this._firstName,
      lastName: this._lastName,
      role: this._role,
      status: this._status,
      phoneNumber: this._phoneNumber?.toString(),
      avatar: this._avatar,
      isEmailVerified: this._isEmailVerified,
      isPhoneVerified: this._isPhoneVerified,
      twoFactorEnabled: this._twoFactorEnabled,
      language: this._language,
      timezone: this._timezone,
      notificationsEnabled: this._notificationsEnabled,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastLoginAt: this._lastLoginAt
    };
  }
}
