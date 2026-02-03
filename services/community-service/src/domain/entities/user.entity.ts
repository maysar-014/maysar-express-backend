import { TrustMetadata } from '../value-objects/trust-metadata.value-object';

/**
 * User roles in the marketplace community
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
 * User status
 */
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated'
}

/**
 * User entity representing a community member
 */
export class User {
  private constructor(
    private readonly _id: string,
    private _username: string,
    private _displayName: string,
    private readonly _role: UserRole,
    private _trustMetadata: TrustMetadata,
    private _status: UserStatus,
    private _isVerified: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
    private _lastActiveAt: Date,
    private _avatarUrl?: string,
    private _bio?: string,
    private _location?: string,
    private _website?: string
  ) {}

  // Factory method for creating new users
  static create(params: {
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
    trustMetadata?: TrustMetadata;
  }): User {
    const now = new Date();
    return new User(
      params.id,
      params.username,
      params.displayName,
      params.role,
      params.trustMetadata || TrustMetadata.createDefault(),
      UserStatus.ACTIVE,
      false,
      now,
      now,
      now
    );
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get username(): string {
    return this._username;
  }

  get displayName(): string {
    return this._displayName;
  }

  get role(): UserRole {
    return this._role;
  }

  get trustMetadata(): TrustMetadata {
    return this._trustMetadata;
  }

  get status(): UserStatus {
    return this._status;
  }

  get isVerified(): boolean {
    return this._isVerified;
  }

  get avatarUrl(): string | undefined {
    return this._avatarUrl;
  }

  get bio(): string | undefined {
    return this._bio;
  }

  get location(): string | undefined {
    return this._location;
  }

  get website(): string | undefined {
    return this._website;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get lastActiveAt(): Date {
    return this._lastActiveAt;
  }

  // Business methods
  updateProfile(params: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    location?: string;
    website?: string;
  }): void {
    if (params.displayName) {
      this._displayName = params.displayName;
    }
    if (params.avatarUrl !== undefined) {
      this._avatarUrl = params.avatarUrl;
    }
    if (params.bio !== undefined) {
      this._bio = params.bio;
    }
    if (params.location !== undefined) {
      this._location = params.location;
    }
    if (params.website !== undefined) {
      this._website = params.website;
    }
    this._updatedAt = new Date();
  }

  updateTrustMetadata(metadata: TrustMetadata): void {
    this._trustMetadata = metadata;
    this._updatedAt = new Date();
  }

  verify(): void {
    this._isVerified = true;
    this._updatedAt = new Date();
  }

  suspend(): void {
    this._status = UserStatus.SUSPENDED;
    this._updatedAt = new Date();
  }

  reactivate(): void {
    this._status = UserStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._status = UserStatus.DEACTIVATED;
    this._updatedAt = new Date();
  }

  updateLastActivity(): void {
    this._lastActiveAt = new Date();
  }

  // Business rules
  canPost(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  canModerate(): boolean {
    return this._role === UserRole.ENABLER;
  }

  canAccessPrivateContent(): boolean {
    return this._status === UserStatus.ACTIVE && this._isVerified;
  }

  // Role-based permissions
  canCreateCommercialPosts(): boolean {
    return [UserRole.SELLER, UserRole.SUPPLIER].includes(this._role);
  }

  canCreateDeliveryUpdates(): boolean {
    return this._role === UserRole.COURIER;
  }

  canCreateSystemNotices(): boolean {
    return this._role === UserRole.ENABLER || this._role === UserRole.SYSTEM;
  }
}
