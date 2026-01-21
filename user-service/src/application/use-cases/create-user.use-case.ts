import { User, UserRole } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { IUserRepository } from '../../domain/repositories';
import { UserPolicies } from '../../domain/policies/user-policies';
import { IDomainEventPublisher, UserRegisteredEvent } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  role?: UserRole;
}

/**
 * Output from creating a new user
 */
export interface CreateUserOutput {
  user: User;
  success: boolean;
  message: string;
}

/**
 * Use case for creating a new user account
 * Handles user registration with validation and domain rules
 */
export class CreateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private eventPublisher: IDomainEventPublisher
  ) {}

  /**
   * Execute the create user use case
   */
  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    try {
      logger.logBusiness('Starting user creation', undefined, { email: input.email });

      // Validate input data
      const validationResult = await this.validateInput(input);
      if (!validationResult.valid) {
        return {
          user: null as any,
          success: false,
          message: validationResult.message
        };
      }

      // Create domain objects
      const email = Email.create(input.email);
      const passwordHash = await PasswordHash.fromPlainPassword(input.password);
      let phoneNumber: PhoneNumber | undefined;

      if (input.phoneNumber) {
        phoneNumber = PhoneNumber.create(input.phoneNumber);
      }

      // Check business rules for registration
      if (phoneNumber) {
        const registrationAllowed = UserPolicies.canRegister(email, phoneNumber);
        if (!registrationAllowed.allowed) {
          return {
            user: null as any,
            success: false,
            message: registrationAllowed.reason || 'Registration not allowed'
          };
        }
      }

      // Check if email already exists
      const existingUser = await this.userRepository.findByEmail(input.email);
      if (existingUser) {
        return {
          user: null as any,
          success: false,
          message: 'Email address already registered'
        };
      }

      // Check if phone number already exists (if provided)
      if (phoneNumber) {
        const existingPhoneUser = await this.userRepository.findByPhoneNumber(phoneNumber.toString());
        if (existingPhoneUser) {
          return {
            user: null as any,
            success: false,
            message: 'Phone number already registered'
          };
        }
      } else {
        // If no phone number provided, we can skip this check
      }

      // Create user entity
      const user = User.create({
        id: this.generateUserId(),
        email,
        passwordHash,
        role: input.role || UserRole.BUYER,
        firstName: input.firstName,
        lastName: input.lastName
      });

      // Update additional fields if provided
      if (phoneNumber) {
        user.updatePhoneNumber(phoneNumber);
      }

      if (input.dateOfBirth) {
        user.updateProfile({ dateOfBirth: input.dateOfBirth });
      }

      // Save user to repository
      const savedUser = await this.userRepository.create(user);

      // Publish domain event
      const userRegisteredEvent = new UserRegisteredEvent(
        savedUser.id,
        savedUser.email.toString(),
        savedUser.role,
        'email' // Default registration method
      );

      await this.eventPublisher.publish(userRegisteredEvent);

      logger.logBusiness('User created successfully', savedUser.id, {
        email: savedUser.email.toString(),
        role: savedUser.role
      });

      return {
        user: savedUser,
        success: true,
        message: 'User account created successfully'
      };

    } catch (error) {
      logger.error('Failed to create user', { email: input.email, error });
      return {
        user: null as any,
        success: false,
        message: 'Failed to create user account'
      };
    }
  }

  /**
   * Validate input data
   */
  private async validateInput(input: CreateUserInput): Promise<{ valid: boolean; message?: string }> {
    // Required fields validation
    if (!input.email || !input.password) {
      return { valid: false, message: 'Email and password are required' };
    }

    // Email format validation
    try {
      Email.create(input.email);
    } catch (error) {
      return { valid: false, message: 'Invalid email format' };
    }

    // Password strength validation
    if (!PasswordHash.isValidPassword(input.password)) {
      return {
        valid: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      };
    }

    // Phone number validation (if provided)
    if (input.phoneNumber) {
      try {
        PhoneNumber.create(input.phoneNumber);
      } catch (error) {
        return { valid: false, message: 'Invalid phone number format' };
      }
    }

    // Age validation (if date of birth provided)
    if (input.dateOfBirth) {
      const age = this.calculateAge(input.dateOfBirth);
      if (age < 13) {
        return { valid: false, message: 'Users must be at least 13 years old' };
      }
    }

    return { valid: true };
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    // In a real implementation, this might use a more sophisticated ID generation
    // For now, we'll use a simple approach
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
