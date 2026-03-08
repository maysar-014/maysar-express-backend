import { PasswordHash } from '../value-objects/password-hash.value-object';
import { Email } from '../value-objects/email.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  GUEST = 'GUEST',
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  COURIER = 'COURIER',
  SUPPLIER = 'SUPPLIER',
  ENABLER = 'ENABLER',
  SYSTEM = 'SYSTEM'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  DEACTIVATED = 'DEACTIVATED',
  LOCKED = 'LOCKED'
}

export interface UserProps {
  id: string;
  email: string | Email;
  role: string;
  status?: string;
  name?: string;
  profile?: any;
  kycStatus?: string;
  passwordHash?: PasswordHash;
  phoneNumber?: PhoneNumber;
  twoFactorSecret?: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  isEmailVerified?: boolean;
  phoneVerified?: boolean;
  isPhoneVerified?: boolean;
  avatar?: string;
  metadata?: Record<string, unknown>;
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  constructor(private props: UserProps) {
    if (!props.createdAt) this.props.createdAt = new Date();
    if (props.failedLoginAttempts === undefined) this.props.failedLoginAttempts = 0;
    if (!props.status) this.props.status = UserStatus.ACTIVE;
  }

  public static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string { return this.props.id; }
  get email(): Email { return typeof this.props.email === 'string' ? { toString: () => this.props.email as string } as Email : this.props.email as Email; }
  get role(): string { return this.props.role; }
  get status(): string { return this.props.status ?? UserStatus.ACTIVE; }
  get profile(): any { return this.props.profile; }
  get passwordHash(): PasswordHash { return this.props.passwordHash!; }
  get twoFactorSecret(): string | undefined { return this.props.twoFactorSecret; }
  get createdAt(): Date { return this.props.createdAt!; }
  get isEmailVerified(): boolean { return this.props.emailVerified === true || this.props.isEmailVerified === true; }
  get name(): string | undefined { return this.props.name ?? this.props.profile?.name; }
  get avatar(): string | undefined { return this.props.avatar; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }

  public isApproved(): boolean {
    return this.props.kycStatus === 'APPROVED';
  }

  public isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  public isLocked(): boolean {
    return this.props.status === UserStatus.LOCKED || (this.props.lockoutUntil && this.props.lockoutUntil > new Date()) || false;
  }

  public requiresTwoFactor(): boolean {
    return this.props.twoFactorEnabled === true;
  }

  public isVerified(): boolean {
    return this.isEmailVerified;
  }

  public canAuthenticate(): boolean {
    return this.props.status === UserStatus.ACTIVE || this.props.status === UserStatus.PENDING_VERIFICATION;
  }

  public canChangePassword(): boolean {
    return this.props.status === UserStatus.ACTIVE;
  }

  public canAccessSystem(): boolean {
    return this.props.status === UserStatus.ACTIVE;
  }

  public recordFailedLogin(): void {
    this.props.failedLoginAttempts = (this.props.failedLoginAttempts || 0) + 1;
    if (this.props.failedLoginAttempts >= 5) {
      this.props.status = UserStatus.LOCKED;
      this.props.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
  }

  public recordSuccessfulLogin(): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockoutUntil = undefined;
  }

  public updatePhoneNumber(phoneNumber: PhoneNumber): void {
    this.props.phoneNumber = phoneNumber;
  }

  public changePassword(newPasswordHash: PasswordHash): void {
    this.props.passwordHash = newPasswordHash;
  }

  public enableTwoFactor(secret: string): void {
    this.props.twoFactorSecret = secret;
    this.props.twoFactorEnabled = true;
  }

  public disableTwoFactor(): void {
    this.props.twoFactorSecret = undefined;
    this.props.twoFactorEnabled = false;
  }

  public verifyEmail(): void {
    this.props.emailVerified = true;
  }

  public verifyPhone(): void {
    this.props.phoneVerified = true;
  }

  public suspend(): void {
    this.props.status = UserStatus.SUSPENDED;
  }

  public reactivate(): void {
    this.props.status = UserStatus.ACTIVE;
  }

  public deactivate(): void {
    this.props.status = UserStatus.DEACTIVATED;
  }

  public unlock(): void {
    this.props.status = UserStatus.ACTIVE;
    this.props.failedLoginAttempts = 0;
    this.props.lockoutUntil = undefined;
  }

  public changeRole(newRole: UserRole): void {
    this.props.role = newRole;
  }
}

// Export UserEntity alias for compatibility
export { User as UserEntity };
