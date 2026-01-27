import { Request, Response } from 'express';
import { UserAlreadyExistsError } from '@domain/errors/user.errors';
import { UserValidationService } from '@domain/services/user-validation.service';
import { UserSecurityPolicy } from '@domain/policies/user-security.policy';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { UserMapper } from '@application/mappers/user-mapper';
import { UserController } from '../user.controller';

// Mock dependencies
jest.mock('@domain/services/user-validation.service');
jest.mock('@domain/policies/user-security.policy');
jest.mock('@application/use-cases/create-user.use-case');
jest.mock('@application/mappers/user-mapper');

describe('UserController', () => {
  let userController: UserController;
  let mockUserValidationService: jest.Mocked<UserValidationService>;
  let mockUserSecurityPolicy: jest.Mocked<UserSecurityPolicy>;
  let mockCreateUserUseCase: jest.Mocked<CreateUserUseCase>;
  let mockUserMapper: jest.Mocked<typeof UserMapper>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockUserValidationService = new UserValidationService() as jest.Mocked<UserValidationService>;
    mockUserSecurityPolicy = new UserSecurityPolicy() as jest.Mocked<UserSecurityPolicy>;
    mockCreateUserUseCase = new CreateUserUseCase(
      mockUserValidationService,
      mockUserSecurityPolicy
    ) as jest.Mocked<CreateUserUseCase>;
    mockUserMapper = UserMapper as jest.Mocked<typeof UserMapper>;

    // Create controller instance
    userController = new UserController(
      mockCreateUserUseCase,
      mockUserValidationService,
      mockUserSecurityPolicy
    );

    // Mock request and response
    mockRequest = {
      body: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        phoneNumber: '+255712345678',
        address: {
          street: '123 Main St',
          city: 'Dar es Salaam',
          country: 'Tanzania',
          postalCode: '12345'
        }
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockUserDto = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockUserValidationService.validateUserCreation.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockUserSecurityPolicy.validateUserCreation.mockReturnValue({
        isValid: true,
        reason: ''
      });

      mockCreateUserUseCase.execute.mockResolvedValue(mockUser);
      mockUserMapper.toDto.mockReturnValue(mockUserDto);

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockUserValidationService.validateUserCreation).toHaveBeenCalledWith(mockRequest.body);
      expect(mockUserSecurityPolicy.validateUserCreation).toHaveBeenCalledWith(mockRequest.body);
      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(mockRequest.body);
      expect(mockUserMapper.toDto).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserDto,
        message: 'User created successfully'
      });
    });

    it('should return 400 when validation fails', async () => {
      // Arrange
      const validationErrors = ['Invalid email', 'Password too short'];
      mockUserValidationService.validateUserCreation.mockReturnValue({
        isValid: false,
        errors: validationErrors
      });

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errors: validationErrors
      });
    });

    it('should return 422 when security policy validation fails', async () => {
      // Arrange
      mockUserValidationService.validateUserCreation.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockUserSecurityPolicy.validateUserCreation.mockReturnValue({
        isValid: false,
        reason: 'Email domain not allowed'
      });

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errors: ['Security policy violation: Email domain not allowed']
      });
    });

    it('should return 409 when user already exists', async () => {
      // Arrange
      mockUserValidationService.validateUserCreation.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockUserSecurityPolicy.validateUserCreation.mockReturnValue({
        isValid: true,
        reason: ''
      });

      const error = new UserAlreadyExistsError('User with this email already exists');
      mockCreateUserUseCase.execute.mockRejectedValue(error);

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'User with this email already exists'
        }
      });
    });

    it('should return 500 for unexpected errors', async () => {
      // Arrange
      mockUserValidationService.validateUserCreation.mockReturnValue({
        isValid: true,
        errors: []
      });

      mockUserSecurityPolicy.validateUserCreation.mockReturnValue({
        isValid: true,
        reason: ''
      });

      const error = new Error('Database connection failed');
      mockCreateUserUseCase.execute.mockRejectedValue(error);

      // Act
      await userController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while creating the user'
        }
      });
    });
  });

  describe('getUserById', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };

      // Act
      await userController.getUserById(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Get user by ID is not yet implemented'
        }
      });
    });
  });

  describe('updateUser', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };

      // Act
      await userController.updateUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Update user is not yet implemented'
        }
      });
    });
  });

  describe('deleteUser', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.params = { id: 'user-123' };

      // Act
      await userController.deleteUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Delete user is not yet implemented'
        }
      });
    });
  });

  describe('verifyEmail', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.params = { token: 'verification-token' };

      // Act
      await userController.verifyEmail(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Email verification is not yet implemented'
        }
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.body = { email: 'test@example.com' };

      // Act
      await userController.requestPasswordReset(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Password reset request is not yet implemented'
        }
      });
    });
  });

  describe('resetPassword', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.params = { token: 'reset-token' };
      mockRequest.body = { newPassword: 'newpassword123' };

      // Act
      await userController.resetPassword(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Password reset is not yet implemented'
        }
      });
    });
  });

  describe('getProfile', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.headers = { 'x-user-id': 'user-123' };

      // Act
      await userController.getProfile(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Get profile is not yet implemented'
        }
      });
    });

    it('should return 401 when user ID is missing', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await userController.getProfile(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });
  });

  describe('updateProfile', () => {
    it('should return 501 not implemented', async () => {
      // Arrange
      mockRequest.headers = { 'x-user-id': 'user-123' };
      mockRequest.body = { firstName: 'Jane' };

      // Act
      await userController.updateProfile(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(501);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Update profile is not yet implemented'
        }
      });
    });

    it('should return 401 when user ID is missing', async () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.body = { firstName: 'Jane' };

      // Act
      await userController.updateProfile(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    });
  });
});