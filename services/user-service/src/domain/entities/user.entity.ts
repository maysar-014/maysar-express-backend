import { Entity } from '../interfaces';
import { Email } from '../value-objects/email.value-object';
import { PhoneNumber } from '../value-objects/phone-number.value-object';
import { Address } from '../value-objects/address.value-object';
import { UserStatus, UserRole, UserMetadata, KycStatus, KycData } from '../types/user.types';

// Re-export types for convenience
export { UserStatus, UserRole, UserMetadata, KycStatus, KycData } from '../types/user.types';

/**
 * User Entity
 * Represents a user in the Maysar marketplace system
 */
export class User implements Entity {
  public readonly id: string;
  public readonly publicCode?: string | undefined;
  public readonly email: Email;
  public readonly phoneNumber: PhoneNumber;
  public readonly passwordHash?: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly dateOfBirth?: Date | undefined;
  public readonly role: UserRole;
  public readonly status: UserStatus;
  public readonly metadata: UserMetadata;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;
  public readonly lastLoginAt?: Date | undefined;
  public readonly emailVerified: boolean;
  public readonly phoneVerified: boolean;
  public readonly profilePicture?: string | undefined;
  public readonly preferredLanguage: string;
  public readonly preferredCurrency: string;
  public readonly addresses: Address[];
  public readonly businessId?: string | undefined;
  public readonly codEnabled: boolean;
  public readonly codReputationScore: number;
  public readonly codSuccessfulOrders: number;
  public readonly codFailedOrders: number;
  public readonly codTotalOrders: number;
  public readonly codLastOrderAt?: Date | undefined;
  public readonly codSuspendedUntil?: Date | undefined;
  public readonly codPermanentlyDisabled: boolean;
  public readonly kycStatus: KycStatus;
  public readonly kycLevel: number;
  public readonly kycSubmittedAt?: Date | undefined;
  public readonly kycVerifiedAt?: Date | undefined;
  public readonly kycData?: KycData | undefined;
  public readonly kycNationalId?: string | undefined;
  public readonly kycLimitMaxListings: number;
  public readonly kycLimitMaxTransactions: number;
  public readonly kycLimitMaxEarnings: number;

  constructor(props: {
    id: string;
    publicCode?: string | undefined;
    email: Email;
    phoneNumber: PhoneNumber;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: Date | undefined;
    role: UserRole;
    status: UserStatus;
    metadata: UserMetadata;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date | undefined;
    emailVerified: boolean;
    phoneVerified: boolean;
    profilePicture?: string | undefined;
    preferredLanguage: string;
    preferredCurrency: string;
    addresses: Address[];
    businessId?: string | undefined;
    codEnabled?: boolean;
    codReputationScore?: number;
    codSuccessfulOrders?: number;
    codFailedOrders?: number;
    codTotalOrders?: number;
    codLastOrderAt?: Date | undefined;
    codSuspendedUntil?: Date | undefined;
    codPermanentlyDisabled?: boolean;
    kycStatus?: KycStatus;
    kycLevel?: number;
    kycSubmittedAt?: Date | undefined;
    kycVerifiedAt?: Date | undefined;
    kycData?: KycData | undefined;
    kycNationalId?: string | undefined;
    kycLimitMaxListings?: number;
    kycLimitMaxTransactions?: number;
    kycLimitMaxEarnings?: number;
  }) {
    this.id = props.id;
    this.publicCode = props.publicCode;
    this.email = props.email;
    this.phoneNumber = props.phoneNumber;
    this.passwordHash = props.passwordHash;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.dateOfBirth = props.dateOfBirth;
    this.role = props.role;
    this.status = props.status;
    this.metadata = props.metadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.lastLoginAt = props.lastLoginAt;
    this.emailVerified = props.emailVerified;
    this.phoneVerified = props.phoneVerified;
    this.profilePicture = props.profilePicture;
    this.preferredLanguage = props.preferredLanguage;
    this.preferredCurrency = props.preferredCurrency;
    this.addresses = props.addresses;
    this.businessId = props.businessId;
    this.codEnabled = props.codEnabled ?? false;
    this.codReputationScore = props.codReputationScore ?? 0;
    this.codSuccessfulOrders = props.codSuccessfulOrders ?? 0;
    this.codFailedOrders = props.codFailedOrders ?? 0;
    this.codTotalOrders = props.codTotalOrders ?? 0;
    this.codLastOrderAt = props.codLastOrderAt;
    this.codSuspendedUntil = props.codSuspendedUntil;
    this.codPermanentlyDisabled = props.codPermanentlyDisabled ?? false;
    this.kycStatus = props.kycStatus ?? KycStatus.NONE;
    this.kycLevel = props.kycLevel ?? 0;
    this.kycSubmittedAt = props.kycSubmittedAt;
    this.kycVerifiedAt = props.kycVerifiedAt;
    this.kycData = props.kycData;
    this.kycNationalId = props.kycNationalId;
    this.kycLimitMaxListings = props.kycLimitMaxListings ?? 5;
    this.kycLimitMaxTransactions = props.kycLimitMaxTransactions ?? 1;
    this.kycLimitMaxEarnings = props.kycLimitMaxEarnings ?? 0;
  }

  /**
   * Create a new user
   */
  static create(props: {
    id: string;
    publicCode?: string;
    email: Email;
    phoneNumber: PhoneNumber;
    passwordHash?: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: Date;
    role: UserRole;
    metadata?: Partial<UserMetadata>;
    preferredLanguage?: string;
    preferredCurrency?: string;
    addresses?: Address[];
    businessId?: string;
    codEnabled?: boolean;
    codReputationScore?: number;
    codSuccessfulOrders?: number;
    codFailedOrders?: number;
    codTotalOrders?: number;
    codLastOrderAt?: Date;
    codSuspendedUntil?: Date;
    codPermanentlyDisabled?: boolean;
    kycStatus?: KycStatus;
    kycLevel?: number;
    kycSubmittedAt?: Date;
    kycVerifiedAt?: Date;
    kycData?: KycData;
    kycNationalId?: string;
    kycLimitMaxListings?: number;
    kycLimitMaxTransactions?: number;
    kycLimitMaxEarnings?: number;
  }): User {
    return new User({
      id: props.id,
      publicCode: props.publicCode,
      email: props.email,
      phoneNumber: props.phoneNumber,
      passwordHash: props.passwordHash,
      firstName: props.firstName,
      lastName: props.lastName,
      dateOfBirth: props.dateOfBirth,
      role: props.role,
      status: UserStatus.ACTIVE,
      metadata: {
        accountAge: 0,
        loginAttempts: 0,
        lastFailedLoginAttempt: props.metadata?.lastFailedLoginAttempt || undefined,
        accountLockedUntil: props.metadata?.accountLockedUntil || undefined,
        ...props.metadata
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: false,
      phoneVerified: false,
      preferredLanguage: props.preferredLanguage || 'sw',
      preferredCurrency: props.preferredCurrency || 'TZS',
      addresses: props.addresses || [],
      businessId: props.businessId,
      codEnabled: props.codEnabled ?? false,
      codReputationScore: props.codReputationScore ?? 0,
      codSuccessfulOrders: props.codSuccessfulOrders ?? 0,
      codFailedOrders: props.codFailedOrders ?? 0,
      codTotalOrders: props.codTotalOrders ?? 0,
      codLastOrderAt: props.codLastOrderAt,
      codSuspendedUntil: props.codSuspendedUntil,
      codPermanentlyDisabled: props.codPermanentlyDisabled ?? false,
      kycStatus: props.kycStatus ?? KycStatus.NONE,
      kycLevel: props.kycLevel ?? 0,
      kycSubmittedAt: props.kycSubmittedAt,
      kycVerifiedAt: props.kycVerifiedAt,
      kycData: props.kycData,
      kycNationalId: props.kycNationalId,
      kycLimitMaxListings: props.kycLimitMaxListings ?? 5,
      kycLimitMaxTransactions: props.kycLimitMaxTransactions ?? 1,
      kycLimitMaxEarnings: props.kycLimitMaxEarnings ?? 0
    });
  }

  /**
   * Update user profile
   */
  updateProfile(props: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    preferredLanguage?: string;
    preferredCurrency?: string;
    profilePicture?: string;
  }): User {
    return new User({
      ...this,
      ...props,
      updatedAt: new Date()
    });
  }

  /**
   * Verify email
   */
  verifyEmail(): User {
    return new User({
      ...this,
      emailVerified: true,
      updatedAt: new Date()
    });
  }

  /**
   * Verify phone number
   */
  verifyPhone(): User {
    return new User({
      ...this,
      phoneVerified: true,
      updatedAt: new Date()
    });
  }

  /**
   * Update last login time
   */
  updateLastLogin(): User {
    return new User({
      ...this,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Update metadata
   */
  updateMetadata(metadata: Partial<UserMetadata>): User {
    return new User({
      ...this,
      metadata: { ...this.metadata, ...metadata },
      updatedAt: new Date()
    });
  }

  /**
   * Add address
   */
  addAddress(address: Address): User {
    return new User({
      ...this,
      addresses: [...this.addresses, address],
      updatedAt: new Date()
    });
  }

  /**
   * Remove address
   */
  removeAddress(addressId: string): User {
    return new User({
      ...this,
      addresses: this.addresses.filter(addr => addr.getId() !== addressId),
      updatedAt: new Date()
    });
  }

  /**
   * Update address
   */
  updateAddress(addressId: string, updatedAddress: Address): User {
    return new User({
      ...this,
      addresses: this.addresses.map(addr => 
        addr.getId() === addressId ? updatedAddress : addr
      ),
      updatedAt: new Date()
    });
  }

  /**
   * Change role
   */
  changeRole(newRole: UserRole): User {
    return new User({
      ...this,
      role: newRole,
      updatedAt: new Date()
    });
  }

  /**
   * Activate user
   */
  activate(): User {
    return new User({
      ...this,
      status: UserStatus.ACTIVE,
      updatedAt: new Date()
    });
  }

  /**
   * Deactivate user
   */
  deactivate(): User {
    return new User({
      ...this,
      status: UserStatus.INACTIVE,
      updatedAt: new Date()
    });
  }

  /**
   * Suspend user
   */
  suspend(): User {
    return new User({
      ...this,
      status: 'suspended',
      updatedAt: new Date()
    });
  }

  /**
   * Check if user is active
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if user is verified
   */
  isVerified(): boolean {
    return this.emailVerified && this.phoneVerified;
  }

  /**
   * Check if user can login
   */
  canLogin(): boolean {
    return this.isActive() && this.isVerified();
  }

  /**
   * Get full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Get primary address
   */
  getPrimaryAddress(): Address | undefined {
    return this.addresses.find(addr => addr.isPrimary);
  }

  /**
   * Check if user has business
   */
  hasBusiness(): boolean {
    return !!this.businessId;
  }

  /**
   * Get user age
   */
  getAge(): number | undefined {
    if (!this.dateOfBirth) return undefined;
    
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if user is adult (18+)
   */
  isAdult(): boolean {
    const age = this.getAge();
    return age !== undefined && age >= 18;
  }

  /**
   * Validate user entity
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id || this.id.trim().length === 0) {
      errors.push('User ID is required');
    }

    if (this.publicCode && !/^MYS-[A-Z0-9]{6}$/i.test(this.publicCode)) {
      errors.push('Invalid public user code format');
    }

    if (!this.email) {
      errors.push('Email is required');
    } else if (!Email.isValid(this.email.getValue())) {
      errors.push('Invalid email format');
    }

    if (this.phoneNumber && this.phoneNumber.value !== '' && !this.phoneNumber.isValid()) {
      errors.push('Invalid phone number format');
    }

    if (!this.firstName || this.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!this.lastName || this.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!this.role) {
      errors.push('User role is required');
    }

    if (!this.status) {
      errors.push('User status is required');
    }

    if (this.dateOfBirth && this.dateOfBirth > new Date()) {
      errors.push('Date of birth cannot be in the future');
    }

    if (this.dateOfBirth) {
      const age = this.getAge();
      if (age !== undefined && age < 13) {
        errors.push('User must be at least 13 years old');
      }
    }

    if (!this.preferredLanguage || this.preferredLanguage.trim().length === 0) {
      errors.push('Preferred language is required');
    }

    if (!this.preferredCurrency || this.preferredCurrency.trim().length === 0) {
      errors.push('Preferred currency is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
