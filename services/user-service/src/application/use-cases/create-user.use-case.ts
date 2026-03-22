import { User } from '../../domain/entities/user.entity';
import { UserValidationService } from '../../domain/services/user-validation.service';
import { UserSecurityPolicy } from '../../domain/policies/user-security.policy';
import { CreateUserDto } from '../dto/user.dto';
import { UserMapper } from '../mappers/user-mapper';
import { UserAlreadyExistsError, UserValidationError } from '../../domain/errors/user.errors';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { IDomainEventPublisher, UserRegisteredEvent } from '../../domain/events';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';
import { IUserRepository } from '../../domain/repositories';
import { PrismaEmailVerificationTokenRepository } from '../../infrastructure/repositories/prisma-email-verification-token.repository';
import { v4 as uuidv4 } from 'uuid';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { generatePublicUserCode } from '@shared/ids/public-codes';

/**
 * Create User Use Case
 * Handles the creation of new users with validation and security checks
 */
export class CreateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private userValidationService: UserValidationService,
    private userSecurityPolicy: UserSecurityPolicy,
    private eventPublisher: IDomainEventPublisher,
    private emailVerificationTokens: PrismaEmailVerificationTokenRepository,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

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
      const publicCode = await this.generateUniquePublicCode();
      const user = UserMapper.toEntity(createUserDto, { publicCode });

      // 5. Validate user entity
      this.userValidationService.validateUser(user);

      // 6. Apply additional business rules
      this.applyBusinessRules(user);

      // 7. Persist user
      const persistedUser = await this.userRepository.create(user);

      // 7. Publish registration event and trigger saga
      const event = new UserRegisteredEvent(
        persistedUser.id,
        persistedUser.email.getValue(),
        persistedUser.role,
        'email',
        persistedUser.publicCode
      );

      await this.eventPublisher.publish(event);
      try {
        await sagaEventHandler.handleUserRegisteredEvent(event, this.emailService, this.notificationClient);
      } catch (error) {
        // Best-effort in-process integration: do not block registration on downstream failures
        console.warn('User registration saga handling failed', {
          error: error instanceof Error ? error.message : error
        });
      }

      // Issue email verification token
      const verificationToken = uuidv4();
      await this.emailVerificationTokens.create({
        id: makeId(getModelPrefix('Auth_EmailVerificationToken')),
        userId: persistedUser.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      try {
        await this.emailService.sendVerificationEmail(persistedUser.email.getValue(), verificationToken);
      } catch (error) {
        // Avoid failing user creation when email delivery is unavailable
        console.warn('Verification email delivery failed', {
          error: error instanceof Error ? error.message : error
        });
      }

      return persistedUser;
    } catch (error) {
      if (error instanceof UserValidationError || error instanceof UserAlreadyExistsError) {
        throw error;
      }
      if (error instanceof Error) {
        const wrapped = new Error(`Failed to create user: ${error.message}`);
        wrapped.name = 'UserInternalError';
        throw wrapped;
      }
      const wrapped = new Error('Failed to create user: Unknown error occurred');
      wrapped.name = 'UserInternalError';
      throw wrapped;
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
    const [emailExists, phoneExists] = await Promise.all([
      this.userRepository.emailExists(email),
      this.userRepository.phoneExists(phoneNumber)
    ]);

    if (emailExists || phoneExists) {
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
    // Broad E.164-style validation (7-15 digits, optional leading +)
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    const e164Like = /^\+?\d{7,15}$/;
    return e164Like.test(normalized);
  }

  /**
   * Generate a unique public user code
   */
  private async generateUniquePublicCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generatePublicUserCode();
      const exists = await this.userRepository.publicCodeExists(code);
      if (!exists) {
        return code;
      }
    }
    throw new UserValidationError('Unable to generate a unique public user code');
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

}

/**
 * User Registration Service
 * Orchestrates the complete user registration process
 */
export class UserRegistrationService {
  constructor(
    private createUserUseCase: CreateUserUseCase
  ) { }

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
