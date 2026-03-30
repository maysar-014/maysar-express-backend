import { DomainService } from '../interfaces';
import { User } from '../entities/user.entity';
import { UserMetadata } from '../types/user.types';

/**
 * User Validation Service
 * Handles complex validation logic for user entities
 */
export class UserValidationService implements DomainService {
  public readonly name = 'UserValidationService';

  /**
   * Validate user for registration
   */
  validateForRegistration(user: User): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic entity validation
    const entityValidation = user.validate();
    if (!entityValidation.isValid) {
      errors.push(...entityValidation.errors);
    }

    // Age validation for Tanzania
    if (user.getAge() !== undefined && user.getAge()! < 18) {
      errors.push('Users must be at least 18 years old to register');
    }

    // Email uniqueness validation (would typically check database)
    if (!this.isValidEmailFormat(user.email.toString())) {
      errors.push('Invalid email format');
    }

    // Phone number validation for Tanzania
    if (user.phoneNumber.isTanzanian()) {
      if (!this.isValidTanzanianPhoneNumber(user.phoneNumber.toString())) {
        errors.push('Invalid Tanzanian phone number format');
      }
    }

    // Address validation for Tanzanian users
    if (user.addresses.some(addr => addr.isTanzanian())) {
      if (!this.hasValidTanzanianAddress(user.addresses)) {
        errors.push('Tanzanian users must have at least one valid Tanzanian address');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user entity
   */
  validateUser(user: User): void {
    const validation = user.validate();
    if (!validation.isValid) {
      throw new Error(`User validation failed: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Validate user business requirements
   */
  validateBusinessUser(user: User): void {
    if (!user.hasBusiness()) {
      throw new Error('Business users must have a business ID');
    }

    if (user.role !== 'seller') {
      throw new Error('Business users must have seller role');
    }

    if (!user.isAdult()) {
      throw new Error('Business users must be adults');
    }
  }

  /**
   * Validate user security requirements
   */
  validateSecurityRequirements(user: User): void {
    if (!user.emailVerified) {
      throw new Error('User must verify email address');
    }

    if (!user.phoneVerified) {
      throw new Error('User must verify phone number');
    }

    if (user.status !== 'active') {
      throw new Error('User account must be active');
    }
  }

  /**
   * Validate user age requirements
   */
  validateAgeRequirements(user: User, minimumAge: number = 13): void {
    if (!user.isAdult() && minimumAge > 13) {
      throw new Error(`User must be at least ${minimumAge} years old`);
    }

    if (!user.isAdult() && minimumAge === 13 && user.getAge() !== undefined && user.getAge()! < 13) {
      throw new Error('User must be at least 13 years old');
    }
  }

  /**
   * Validate user for login
   */
  validateForLogin(user: User): { canLogin: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.isActive()) {
      errors.push('Account is not active');
    }

    if (!user.isVerified()) {
      errors.push('Account is not verified');
    }

    if (user.metadata.accountLockedUntil && user.metadata.accountLockedUntil > new Date()) {
      errors.push('Account is temporarily locked');
    }

    if (user.metadata.loginAttempts > 5) {
      errors.push('Too many failed login attempts');
    }

    return {
      canLogin: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user for business registration
   */
  validateForBusinessRegistration(user: User, businessInfo: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.isAdult()) {
      errors.push('User must be at least 18 years old to register a business');
    }

    if (!user.isVerified()) {
      errors.push('User must be verified to register a business');
    }

    if (!this.hasValidBusinessAddress(user.addresses)) {
      errors.push('Business must have a valid address');
    }

    if (!this.isValidBusinessInfo(businessInfo)) {
      errors.push('Invalid business information');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user metadata updates
   */
  validateMetadataUpdate(_user: User, newMetadata: Partial<UserMetadata>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate risk score bounds
    if (newMetadata.riskScore !== undefined) {
      if (newMetadata.riskScore < 0 || newMetadata.riskScore > 100) {
        errors.push('Risk score must be between 0 and 100');
      }
    }

    // Validate login attempts
    if (newMetadata.loginAttempts !== undefined) {
      if (newMetadata.loginAttempts < 0) {
        errors.push('Login attempts cannot be negative');
      }
    }

    // Validate account age
    if (newMetadata.accountAge !== undefined) {
      if (newMetadata.accountAge < 0) {
        errors.push('Account age cannot be negative');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if email format is valid
   */
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate Tanzanian phone number format
   */
  private isValidTanzanianPhoneNumber(phone: string): boolean {
    // Tanzanian mobile numbers: +255 6xx xxx xxx or +255 7xx xxx xxx
    // Tanzanian landlines: +255 2xx xxx xxx
    const tanzanianMobileRegex = /^\+255[67]\d{8}$/;
    const tanzanianLandlineRegex = /^\+255[28]\d{8}$/;
    
    return tanzanianMobileRegex.test(phone) || tanzanianLandlineRegex.test(phone);
  }

  /**
   * Check if user has valid Tanzanian address
   */
  private hasValidTanzanianAddress(addresses: any[]): boolean {
    return addresses.some(addr => 
      addr.isTanzanian() && 
      addr.street && addr.city && addr.country && addr.postalCode
    );
  }

  /**
   * Check if user has valid business address
   */
  private hasValidBusinessAddress(addresses: any[]): boolean {
    return addresses.some(addr => 
      addr.type === 'business' && 
      addr.street && addr.city && addr.country
    );
  }

  /**
   * Validate business information
   */
  private isValidBusinessInfo(businessInfo: any): boolean {
    if (!businessInfo.businessName || businessInfo.businessName.trim().length === 0) {
      return false;
    }

    if (!businessInfo.businessType || businessInfo.businessType.trim().length === 0) {
      return false;
    }

    return true;
  }
}
