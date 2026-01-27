import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { Address } from '../../domain/value-objects/address.value-object';
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
  /**
   * Map CreateUserDto to User entity
   */
  static toEntity(createUserDto: CreateUserDto): User {
    return User.create({
      id: this.generateUserId(),
      email: Email.create(createUserDto.email),
      phoneNumber: PhoneNumber.create(createUserDto.phoneNumber),
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      dateOfBirth: createUserDto.dateOfBirth,
      role: createUserDto.role,
      preferredLanguage: createUserDto.preferredLanguage,
      preferredCurrency: createUserDto.preferredCurrency,
      addresses: createUserDto.addresses || [],
      businessId: createUserDto.businessId
    });
  }

  /**
   * Map User entity to UserResponseDto
   */
  static toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email.value,
      phoneNumber: user.phoneNumber.value,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      profilePicture: user.profilePicture,
      preferredLanguage: user.preferredLanguage,
      preferredCurrency: user.preferredCurrency,
      addresses: user.addresses,
      businessId: user.businessId,
      metadata: {
        accountAge: user.metadata.accountAge,
        loginAttempts: user.metadata.loginAttempts,
        lastFailedLoginAttempt: user.metadata.lastFailedLoginAttempt,
        accountLockedUntil: user.metadata.accountLockedUntil
      },
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Map User entity to UserSummaryDto
   */
  static toSummaryDto(user: User): UserSummaryDto {
    return {
      id: user.id,
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
      businessId: user.businessId,
      lastLoginAt: user.lastLoginAt,
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
      businessId: user.businessId,
      lastLoginAt: user.lastLoginAt,
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
      lastLoginAt: user.lastLoginAt,
      lastActivityAt: recentActivity.length > 0 ? recentActivity[0].timestamp : undefined,
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
      lastVerificationAttempt: user.lastLoginAt,
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
      firstName: updateDto.firstName,
      lastName: updateDto.lastName,
      dateOfBirth: updateDto.dateOfBirth,
      preferredLanguage: updateDto.preferredLanguage,
      preferredCurrency: updateDto.preferredCurrency,
      profilePicture: updateDto.profilePicture
    });
  }

  /**
   * Update user metadata from UpdateUserMetadataDto
   */
  static updateMetadataFromDto(user: User, updateDto: UpdateUserMetadataDto): User {
    return user.updateMetadata({
      loginAttempts: updateDto.loginAttempts,
      riskScore: updateDto.riskScore,
      accountAge: updateDto.accountAge,
      lastFailedLoginAttempt: updateDto.lastFailedLoginAttempt,
      accountLockedUntil: updateDto.accountLockedUntil
    });
  }

  /**
   * Add address from AddAddressDto
   */
  static addAddressFromDto(user: User, addAddressDto: AddAddressDto): User {
    const address = Address.create({
      id: this.generateAddressId(),
      userId: user.id,
      type: addAddressDto.type as 'billing' | 'shipping' | 'business' | 'home',
      isPrimary: addAddressDto.isPrimary,
      street: addAddressDto.street,
      city: addAddressDto.city,
      state: addAddressDto.state,
      postalCode: addAddressDto.postalCode,
      country: addAddressDto.country,
      coordinates: addAddressDto.coordinates,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return user.addAddress(address);
  }

  /**
   * Update address from UpdateAddressDto
   */
  static updateAddressFromDto(user: User, updateAddressDto: UpdateAddressDto): User {
    const address = Address.create({
      id: updateAddressDto.id,
      userId: user.id,
      type: (updateAddressDto.type || 'shipping') as 'billing' | 'shipping' | 'business' | 'home',
      isPrimary: updateAddressDto.isPrimary || false,
      street: updateAddressDto.street || '',
      city: updateAddressDto.city || '',
      state: updateAddressDto.state,
      postalCode: updateAddressDto.postalCode || '',
      country: updateAddressDto.country || '',
      coordinates: updateAddressDto.coordinates,
      createdAt: new Date(), // This would typically be preserved
      updatedAt: new Date()
    });

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
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique address ID
   */
  private static generateAddressId(): string {
    return `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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