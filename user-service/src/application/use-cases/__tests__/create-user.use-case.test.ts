import { CreateUserUseCase } from '../create-user.use-case';
import { UserValidationService } from '../../../domain/services/user-validation.service';
import { UserSecurityPolicy } from '../../../domain/policies/user-security.policy';
import { CreateUserDto } from '../../dto/user.dto';
import { UserAlreadyExistsError, UserValidationError } from '../../../domain/errors/user.errors';

// Mock dependencies
jest.mock('../../../domain/services/user-validation.service');
jest.mock('../../../domain/policies/user-security.policy');

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserValidationService: jest.Mocked<UserValidationService>;
  let mockUserSecurityPolicy: jest.Mocked<UserSecurityPolicy>;

  beforeEach(() => {
    mockUserValidationService = new UserValidationService() as jest.Mocked<UserValidationService>;
    mockUserSecurityPolicy = new UserSecurityPolicy() as jest.Mocked<UserSecurityPolicy>;
    
    createUserUseCase = new CreateUserUseCase(
      mockUserValidationService,
      mockUserSecurityPolicy
    );

    // Setup default mocks
    mockUserValidationService.validateUser = jest.fn();
    mockUserSecurityPolicy.isSuspiciousEmail = jest.fn().mockReturnValue(false);
    mockUserSecurityPolicy.isSuspiciousPhoneNumber = jest.fn().mockReturnValue(false);
    mockUserSecurityPolicy.isRateLimited = jest.fn().mockReturnValue(false);
  });

  describe('execute', () => {
    const validCreateUserDto: CreateUserDto = {
      email: 'test@example.com',
      phoneNumber: '+255712345678',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer',
      preferredLanguage: 'en',
      preferredCurrency: 'USD'
    };

    it('should create a user successfully with valid input', async () => {
      const result = await createUserUseCase.execute(validCreateUserDto);
      
      expect(result).toBeDefined();
      expect(result.email.toString()).toBe(validCreateUserDto.email);
      expect(result.firstName).toBe(validCreateUserDto.firstName);
      expect(result.lastName).toBe(validCreateUserDto.lastName);
      expect(mockUserValidationService.validateUser).toHaveBeenCalled();
    });

    it('should throw UserValidationError for invalid email', async () => {
      const invalidDto = { ...validCreateUserDto, email: 'invalid-email' };
      
      await expect(createUserUseCase.execute(invalidDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for invalid phone number', async () => {
      const invalidDto = { ...validCreateUserDto, phoneNumber: 'invalid-phone' };
      
      await expect(createUserUseCase.execute(invalidDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for short first name', async () => {
      const invalidDto = { ...validCreateUserDto, firstName: 'J' };
      
      await expect(createUserUseCase.execute(invalidDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for short last name', async () => {
      const invalidDto = { ...validCreateUserDto, lastName: 'D' };
      
      await expect(createUserUseCase.execute(invalidDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for invalid role', async () => {
      const invalidDto = { ...validCreateUserDto, role: 'invalid-role' as any };
      
      await expect(createUserUseCase.execute(invalidDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for suspicious email', async () => {
      mockUserSecurityPolicy.isSuspiciousEmail.mockReturnValue(true);
      
      await expect(createUserUseCase.execute(validCreateUserDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for suspicious phone number', async () => {
      mockUserSecurityPolicy.isSuspiciousPhoneNumber.mockReturnValue(true);
      
      await expect(createUserUseCase.execute(validCreateUserDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for rate limited user', async () => {
      mockUserSecurityPolicy.isRateLimited.mockReturnValue(true);
      
      await expect(createUserUseCase.execute(validCreateUserDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for underage user', async () => {
      const underageDto = {
        ...validCreateUserDto,
        dateOfBirth: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 10) // 10 years ago
      };
      
      await expect(createUserUseCase.execute(underageDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should throw UserValidationError for invalid business ID', async () => {
      const invalidBusinessDto = {
        ...validCreateUserDto,
        businessId: 'invalid-biz-id'
      };
      
      await expect(createUserUseCase.execute(invalidBusinessDto))
        .rejects.toThrow(UserValidationError);
    });

    it('should handle unknown errors gracefully', async () => {
      // Mock an unexpected error
      mockUserValidationService.validateUser.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(createUserUseCase.execute(validCreateUserDto))
        .rejects.toThrow(UserValidationError);
    });
  });
});