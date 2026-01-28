import { User } from '../../domain/entities/user.entity';
import { UserValidationService } from '../../domain/services/user-validation.service';
import { UserSecurityPolicy } from '../../domain/policies/user-security.policy';
import { CreateUserDto } from '../dto/user.dto';
import { UserMapper } from '../mappers/user-mapper';
import { UserAlreadyExistsError, UserValidationError } from '../../domain/errors/user.errors';

/**
 * Create User Use Case
 * Handles the creation of new users with validation and security checks
 */
export class CreateUserUseCase {
  constructor(
    private userValidationService: UserValidationService,
    private userSecurityPolicy: UserSecurityPolicy
  ) {}

  /**
   * Execute user creation
   */
  async execute(createUserDto: CreateUserDto): Promise<User> {
    try {
      // 1. Validate input data
      this.validateInput(createUserDto);

      // 2. Check for existing user
      await this.checkExistingUser(createUserDto.email, createUserDto.phoneNumber);

      // 3. Apply security policies
      this.applySecurityPolicies(createUserDto);

      // 4. Create user entity
      const user = UserMapper.toEntity(createUserDto);

      // 5. Validate user entity
      this.userValidationService.validateUser(user);

      // 6. Apply additional business rules
      this.applyBusinessRules(user);

      return user;
    } catch (error) {
      if (error instanceof UserValidationError || error instanceof UserAlreadyExistsError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new UserValidationError(`Failed to create user: ${error.message}`);
      }
      throw new UserValidationError('Failed to create user: Unknown error occurred');
    }
  }

  /**
   * Validate input data
   */
  private validateInput(createUserDto: CreateUserDto): void {
    const { email, phoneNumber, firstName, lastName, role } = createUserDto;

    // Basic validation
    if (!email || !this.isValidEmail(email)) {
      throw new UserValidationError('Invalid email format');
    }

    if (!phoneNumber || !this.isValidPhoneNumber(phoneNumber)) {
      throw new UserValidationError('Invalid phone number format');
    }

    if (!firstName || firstName.trim().length < 2) {
      throw new UserValidationError('First name must be at least 2 characters');
    }

    if (!lastName || lastName.trim().length < 2) {
      throw new UserValidationError('Last name must be at least 2 characters');
    }

    if (!role || !this.isValidUserRole(role)) {
      throw new UserValidationError('Invalid user role');
    }
  }

  /**
   * Check for existing user
   */
  private async checkExistingUser(email: string, phoneNumber: string): Promise<void> {
    // This would typically call a repository to check for existing users
    // For now, we'll simulate this check
    const existingUser = await this.findUserByEmailOrPhone(email, phoneNumber);
    
    if (existingUser) {
      throw new UserAlreadyExistsError('User with this email or phone number already exists');
    }
  }

  /**
   * Apply security policies
   */
  private applySecurityPolicies(createUserDto: CreateUserDto): void {
    // Check for suspicious patterns
    if (this.userSecurityPolicy.isSuspiciousEmail(createUserDto.email)) {
      throw new UserValidationError('Email address appears to be suspicious');
    }

    if (this.userSecurityPolicy.isSuspiciousPhoneNumber(createUserDto.phoneNumber)) {
      throw new UserValidationError('Phone number appears to be suspicious');
    }

    // Check for rate limiting (would be implemented with a cache/service)
    if (this.userSecurityPolicy.isRateLimited(createUserDto.email)) {
      throw new UserValidationError('Too many registration attempts. Please try again later');
    }
  }

  /**
   * Apply business rules
   */
  private applyBusinessRules(user: User): void {
    // Apply age verification rules
    if (user.dateOfBirth && !user.isAdult()) {
      throw new UserValidationError('Users must be at least 13 years old');
    }

    // Validate business ID if provided
    if (user.businessId && !this.isValidBusinessId(user.businessId)) {
      throw new UserValidationError('Invalid business ID format');
    }
  }

  /**
   * Helper method to validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Helper method to validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Tanzanian phone number format validation
    const tanzanianPhoneRegex = /^(\+255|0)(7[0-9]|6[0-9]|2[0-9])\d{7}$/;
    return tanzanianPhoneRegex.test(phoneNumber.replace(/\s+/g, ''));
  }

  /**
   * Helper method to validate user role
   */
  private isValidUserRole(role: string): boolean {
    const validRoles = ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'system'];
    return validRoles.includes(role?.toLowerCase() || '');
  }

  /**
   * Helper method to validate business ID
   */
  private isValidBusinessId(businessId: string): boolean {
    // Business ID format: BIZ followed by 6-10 digits
    const businessIdRegex = /^BIZ\d{6,10}$/;
    return businessIdRegex.test(businessId.toUpperCase());
  }

  /**
   * Simulate finding existing user (would be implemented with repository)
   */
  private async findUserByEmailOrPhone(_email: string, _phoneNumber: string): Promise<User | null> {
    // TODO: Implement actual database lookup
    // For now, return null as we don't have a real database connection
    return null;
  }
}

/**
 * User Registration Service
 * Orchestrates the complete user registration process
 */
export class UserRegistrationService {
  constructor(
    private createUserUseCase: CreateUserUseCase
  ) {}

  /**
   * Register a new user
   */
  async registerUser(createUserDto: CreateUserDto): Promise<User> {
    // Execute the use case
    const user = await this.createUserUseCase.execute(createUserDto);

    // Additional registration logic could go here:
    // - Send welcome email
    // - Create user preferences
    // - Initialize user settings
    // - Log registration event

    return user;
  }

  /**
   * Register a business user
   */
  async registerBusinessUser(createUserDto: CreateUserDto, businessId: string): Promise<User> {
    // Validate business user requirements
    if (createUserDto.role !== 'seller') {
      throw new UserValidationError('Business users must have seller role');
    }

    if (!businessId) {
      throw new UserValidationError('Business ID is required for business users');
    }

    // Set business ID
    createUserDto.businessId = businessId;

    // Execute registration
    return this.registerUser(createUserDto);
  }
}