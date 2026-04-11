import { User } from '../../domain/entities/user.entity';
import { UserMetadata, UserRole } from '../../domain/types/user.types';
import { Email } from '../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { Address } from '../../domain/value-objects/address.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';
import {
  CreateUserDto,
  UpdateUserProfileDto,
  UpdateUserMetadataDto,
  AddAddressDto,
  UpdateAddressDto,
  UserResponseDto,
  UserSummaryDto,
  AuthUserDto,
  UserActivityDto,
  UserVerificationDto,
  UserPreferencesDto
} from '../dto/user.dto';

/**
 * User Mapper - Converts between domain entities and DTOs
 */
export class UserMapper {
  private static resolveMetadataRoles(metadata: UserMetadata | Record<string, unknown> | undefined): UserRole[] {
    const metadataRecord = (metadata || {}) as Record<string, unknown>;
    const rawRoles = metadataRecord.roles ?? metadataRecord.allowedRoles;
    const candidateRoles = Array.isArray(rawRoles)
      ? rawRoles
      : typeof rawRoles === 'string'
        ? rawRoles.split(',')
        : [];
    const allowedRoles = new Set(Object.values(UserRole) as string[]);
    const normalizedRoles = candidateRoles
      .map((role) => String(role).trim().toLowerCase())
      .filter((role) => allowedRoles.has(role));

    return Array.from(new Set(normalizedRoles)) as UserRole[];
  }

  /**
   * Map CreateUserDto to User entity
   */
  static toEntity(createUserDto: CreateUserDto, options?: { publicCode?: string }): User {
    return User.create({
      id: this.generateUserId(),
      ...(options?.publicCode ? { publicCode: options.publicCode } : {}),
      email: Email.create(createUserDto.email),
      phoneNumber: PhoneNumber.create(createUserDto.phoneNumber),
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      ...(createUserDto.dateOfBirth && { dateOfBirth: createUserDto.dateOfBirth }),
      role: createUserDto.role,
      ...(createUserDto.preferredLanguage && { preferredLanguage: createUserDto.preferredLanguage }),
      ...(createUserDto.preferredCurrency && { preferredCurrency: createUserDto.preferredCurrency }),
      ...(createUserDto.addresses && { addresses: createUserDto.addresses }),
      ...(createUserDto.businessId && { businessId: createUserDto.businessId })
    });
  }

  /**
   * Map User entity to UserResponseDto (alias for toDTO)
   */
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      publicCode: user.publicCode,
      email: user.email.value,
      phoneNumber: user.phoneNumber.value,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      dateOfBirth: user.dateOfBirth || new Date(0),
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      profilePicture: user.profilePicture || '',
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      addresses: user.addresses,
      businessId: user.businessId || '',
      metadata: {
        accountAge: user.metadata.accountAge,
        loginAttempts: user.metadata.loginAttempts,
        lastFailedLoginAttempt: user.metadata.lastFailedLoginAttempt || new Date(0),
        accountLockedUntil: user.metadata.accountLockedUntil || new Date(0),
        roles: this.resolveMetadataRoles(user.metadata)
      },
      lastLoginAt: user.lastLoginAt || new Date(0),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Map User entity to UserResponseDto (verbatim from plan)
   */
  static toDTO(user: User): UserResponseDto {
    return this.toResponseDto(user);
  }

  /**
   * Map database records to User entities
   */
  static toDomain(userData: any): User {
    const addresses = userData.addresses ? userData.addresses.map((addr: any) => Address.create({
      id: addr.id,
      userId: addr.userId,
      type: addr.type,
      isPrimary: addr.isPrimary || addr.isDefault || false,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      coordinates: addr.coordinates,
      createdAt: addr.createdAt,
      updatedAt: addr.updatedAt
    })) : [];

    return User.create({
      id: userData.id,
      publicCode: userData.publicCode ?? undefined,
      email: Email.create(userData.email),
      phoneNumber: PhoneNumber.create(userData.phoneNumber || ''),
      passwordHash: userData.passwordHash ?? undefined,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      dateOfBirth: userData.dateOfBirth,
      role: userData.role,
      preferredLanguage: userData.language || 'en',
      preferredCurrency: userData.timezone || 'UTC',
      addresses,
      businessId: userData.businessId,
      metadata: {
        loginAttempts: userData.failedLoginAttempts || 0,
        accountLockedUntil: userData.lockoutUntil || undefined
      }
    });
  }

  /**
   * Map User entities to database format
   */
  static toPersistence(user: User): any {
    const data: Record<string, any> = {
      id: user.id,
      publicCode: user.publicCode,
      email: user.email.value,
      phoneNumber: user.phoneNumber.value,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      status: user.status,
      language: user.preferredLanguage,
      timezone: user.preferredCurrency,
      isEmailVerified: user.emailVerified,
      isPhoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      businessId: user.businessId,
      failedLoginAttempts: user.metadata.loginAttempts,
      lockoutUntil: user.metadata.accountLockedUntil,
      lastLoginAt: user.lastLoginAt
    };
    if (user.passwordHash !== undefined) {
      data.passwordHash = user.passwordHash;
    }
    return data;
  }

  /**
   * Map User entity to UserSummaryDto
   */
  static toSummaryDto(user: User): UserSummaryDto {
    return {
      id: user.id,
      publicCode: user.publicCode,
      email: user.email.value,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      ...(user.businessId !== undefined && { businessId: user.businessId }),
      ...(user.lastLoginAt !== undefined && { lastLoginAt: user.lastLoginAt }),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Map User entity to AuthUserDto
   */
  static toAuthDto(user: User): AuthUserDto {
    return {
      id: user.id,
      publicCode: user.publicCode,
      email: user.email.value,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      roles: this.resolveMetadataRoles(user.metadata),
      ...(user.businessId !== undefined && { businessId: user.businessId }),
      ...(user.lastLoginAt !== undefined && { lastLoginAt: user.lastLoginAt }),
      addresses: user.addresses
    };
  }

  /**
   * Map User entity to UserActivityDto
   */
  static toActivityDto(user: User, recentActivity: any[] = []): UserActivityDto {
    return {
      userId: user.id,
      email: user.email.getValue(),
      firstName: user.firstName,
      lastName: user.lastName,
      ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt }),
      lastActivityAt: recentActivity.length > 0 ? recentActivity[0].timestamp : new Date(0),
      loginCount: user.metadata.accountAge, // This would typically come from a separate service
      failedLoginAttempts: user.metadata.loginAttempts,
      riskScore: user.metadata.riskScore || 0,
      isActive: user.isActive(),
      isVerified: user.isVerified(),
      recentActivity: recentActivity
    };
  }

  /**
   * Map User entity to UserVerificationDto
   */
  static toVerificationDto(user: User): UserVerificationDto {
    return {
      userId: user.id,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      identityVerified: false, // This would come from a separate verification service
      businessVerified: !!user.businessId, // Simplified logic
      verificationStatus: user.emailVerified && user.phoneVerified ? 'verified' : 'pending',
      verificationAttempts: user.metadata.loginAttempts,
      lastVerificationAttempt: user.lastLoginAt || new Date(0), // Use epoch date if undefined
      verificationDocuments: [] // This would come from a separate verification service
    };
  }

  /**
   * Map User entity to UserPreferencesDto
   */
  static toPreferencesDto(user: User): UserPreferencesDto {
    return {
      userId: user.id,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      notifications: {
        email: true, // Default values - would come from user preferences
        sms: true,
        push: true,
        marketing: true
      },
      privacy: {
        profileVisible: true,
        emailVisible: user.emailVerified,
        phoneVisible: user.phoneVerified,
        locationVisible: false
      },
      theme: {
        darkMode: false,
        fontSize: 'medium',
        layout: 'comfortable'
      }
    };
  }

  /**
   * Update user profile from UpdateUserProfileDto
   */
  static updateProfileFromDto(user: User, updateDto: UpdateUserProfileDto): User {
    return user.updateProfile({
      ...(updateDto.firstName !== undefined && { firstName: updateDto.firstName }),
      ...(updateDto.lastName !== undefined && { lastName: updateDto.lastName }),
      ...(updateDto.dateOfBirth !== undefined && { dateOfBirth: updateDto.dateOfBirth }),
      ...(updateDto.preferredLanguage !== undefined && { preferredLanguage: updateDto.preferredLanguage }),
      ...(updateDto.preferredCurrency !== undefined && { preferredCurrency: updateDto.preferredCurrency }),
      ...(updateDto.profilePicture !== undefined && { profilePicture: updateDto.profilePicture })
    });
  }

  /**
   * Update user metadata from UpdateUserMetadataDto
   */
  static updateMetadataFromDto(user: User, updateDto: UpdateUserMetadataDto): User {
    return user.updateMetadata({
      ...(updateDto.loginAttempts !== undefined && { loginAttempts: updateDto.loginAttempts }),
      ...(updateDto.riskScore !== undefined && { riskScore: updateDto.riskScore }),
      ...(updateDto.accountAge !== undefined && { accountAge: updateDto.accountAge }),
      ...(updateDto.lastFailedLoginAttempt !== undefined && { lastFailedLoginAttempt: updateDto.lastFailedLoginAttempt }),
      ...(updateDto.accountLockedUntil !== undefined && { accountLockedUntil: updateDto.accountLockedUntil })
    });
  }

  /**
   * Add address from AddAddressDto
   */
  static addAddressFromDto(user: User, addAddressDto: AddAddressDto): User {
    const addressData: any = {
      id: this.generateAddressId(),
      userId: user.id,
      type: addAddressDto.type as 'billing' | 'shipping' | 'business' | 'home',
      isPrimary: addAddressDto.isPrimary,
      street: addAddressDto.street || '',
      city: addAddressDto.city || '',
      postalCode: addAddressDto.postalCode || '',
      country: addAddressDto.country || '',
      coordinates: addAddressDto.coordinates,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (addAddressDto.state !== undefined) {
      addressData.state = addAddressDto.state;
    }

    const address = Address.create(addressData);

    return user.addAddress(address);
  }

  /**
   * Update address from UpdateAddressDto
   */
  static updateAddressFromDto(user: User, updateAddressDto: UpdateAddressDto): User {
    const addressData: any = {
      id: updateAddressDto.id,
      userId: user.id,
      type: (updateAddressDto.type || 'shipping') as 'billing' | 'shipping' | 'business' | 'home',
      isPrimary: updateAddressDto.isPrimary || false,
      street: updateAddressDto.street || '',
      city: updateAddressDto.city || '',
      postalCode: updateAddressDto.postalCode || '',
      country: updateAddressDto.country || '',
      coordinates: updateAddressDto.coordinates,
      createdAt: new Date(), // This would typically be preserved
      updatedAt: new Date()
    };

    if (updateAddressDto.state !== undefined) {
      addressData.state = updateAddressDto.state;
    }

    const address = Address.create(addressData);

    return user.updateAddress(updateAddressDto.id, address);
  }

  /**
   * Remove address by ID
   */
  static removeAddress(user: User, addressId: string): User {
    return user.removeAddress(addressId);
  }

  /**
   * Generate a unique user ID
   */
  private static generateUserId(): string {
    return makeId(getModelPrefix('User_User'));
  }

  /**
   * Generate a unique address ID
   */
  private static generateAddressId(): string {
    return makeId(getModelPrefix('User_UserAddress'));
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Validate and sanitize phone number
   */
  static sanitizePhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\s+/g, '').trim();
  }

  /**
   * Validate and sanitize name
   */
  static sanitizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if user is eligible for business features
   */
  static isBusinessUser(user: User): boolean {
    return user.hasBusiness() && user.role === 'seller';
  }

  /**
   * Get user's primary address
   */
  static getPrimaryAddress(user: User): Address | undefined {
    return user.getPrimaryAddress();
  }

  /**
   * Get user's Tanzanian addresses
   */
  static getTanzanianAddresses(user: User): Address[] {
    return user.addresses.filter(addr => addr.isTanzanian());
  }

  /**
   * Calculate user's age from date of birth
   */
  static calculateAge(dateOfBirth?: Date): number | undefined {
    if (!dateOfBirth) return undefined;

    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Check if user is an adult (18+)
   */
  static isAdult(user: User): boolean {
    return user.isAdult();
  }

  /**
   * Check if user can perform business operations
   */
  static canPerformBusinessOperations(user: User): boolean {
    return user.isActive() && user.isVerified() && user.isAdult() && user.hasBusiness();
  }

  /**
   * Get user's risk level based on metadata
   */
  static getUserRiskLevel(user: User): 'low' | 'medium' | 'high' {
    const riskScore = user.metadata.riskScore || 0;

    if (riskScore < 25) return 'low';
    if (riskScore < 75) return 'medium';
    return 'high';
  }

  /**
   * Check if user account is locked
   */
  static isAccountLocked(user: User): boolean {
    if (!user.metadata.accountLockedUntil) return false;

    return user.metadata.accountLockedUntil > new Date();
  }

  /**
   * Get time until account unlock
   */
  static getTimeUntilUnlock(user: User): number {
    if (!user.metadata.accountLockedUntil) return 0;

    const now = new Date();
    const unlockTime = user.metadata.accountLockedUntil;

    if (unlockTime <= now) return 0;

    return unlockTime.getTime() - now.getTime();
  }
}
