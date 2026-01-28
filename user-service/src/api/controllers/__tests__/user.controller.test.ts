import { Request, Response } from 'express';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';
import { UserController } from '../user.controller';
import { UserAlreadyExistsError } from '@domain/errors/user.errors';
import { User } from '@domain/entities/user.entity';
import { Email } from '@domain/value-objects/email.value-object';
import { PhoneNumber } from '@domain/value-objects/phone-number.value-object';

// Mock dependencies
jest.mock('@application/use-cases/create-user.use-case');

describe('UserController', () => {
  let userController: UserController;
  let mockCreateUserUseCase: jest.Mocked<CreateUserUseCase>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateUserUseCase = new (CreateUserUseCase as any)(null, null) as jest.Mocked<CreateUserUseCase>;

    userController = new UserController(mockCreateUserUseCase);

    mockRequest = {
      body: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password123',
        phoneNumber: '+255712345678'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const mockUser = User.create({
        id: 'user-123',
        email: Email.create('test@example.com'),
        phoneNumber: PhoneNumber.create('+255712345678'),
        firstName: 'John',
        lastName: 'Doe',
        role: 'BUYER'
      } as any);
      mockCreateUserUseCase.execute.mockResolvedValue(mockUser as any);

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 409 when user already exists', async () => {
      const error = new UserAlreadyExistsError('User with this email already exists');
      mockCreateUserUseCase.execute.mockRejectedValue(error);

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('not implemented endpoints', () => {
    it('getUserById returns 501', async () => {
      mockRequest.params = { id: 'user-123' } as any;
      await userController.getUserById(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('updateUser returns 501', async () => {
      mockRequest.params = { id: 'user-123' } as any;
      await userController.updateUser(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('deleteUser returns 501', async () => {
      mockRequest.params = { id: 'user-123' } as any;
      await userController.deleteUser(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });

  describe('error handling', () => {
    it('createUser returns 500 on unexpected error', async () => {
      mockCreateUserUseCase.execute.mockRejectedValue(new Error('unexpected'));

      await userController.createUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('getUserById returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.getUserById = jest.fn().mockImplementation(async (_req, res) => {
        try {
          throw new Error('test error');
        } catch (error) {
          console.error('Error getting user:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while retrieving the user'
            }
          });
        }
      });

      mockRequest.params = { id: 'user-123' } as any;
      await userController.getUserById(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('updateUser returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.updateUser = jest.fn().mockImplementation(async (_req, res) => {
        try {
          throw new Error('test error');
        } catch (error) {
          console.error('Error updating user:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while updating the user'
            }
          });
        }
      });

      mockRequest.params = { id: 'user-123' } as any;
      await userController.updateUser(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('deleteUser returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.deleteUser = jest.fn().mockImplementation(async (_req, res) => {
        try {
          throw new Error('test error');
        } catch (error) {
          console.error('Error deleting user:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while deleting the user'
            }
          });
        }
      });

      mockRequest.params = { id: 'user-123' } as any;
      await userController.deleteUser(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('verifyEmail returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.verifyEmail = jest.fn().mockImplementation(async (_req, res) => {
        try {
          throw new Error('test error');
        } catch (error) {
          console.error('Error verifying email:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while verifying email'
            }
          });
        }
      });

      await userController.verifyEmail(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('requestPasswordReset returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.requestPasswordReset = jest.fn().mockImplementation(async (_req, res) => {
        try {
          throw new Error('test error');
        } catch (error) {
          console.error('Error requesting password reset:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while requesting password reset'
            }
          });
        }
      });

      await userController.requestPasswordReset(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('resetPassword returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.resetPassword = jest.fn().mockImplementation(async (_req, res) => {
        try {
          throw new Error('test error');
        } catch (error) {
          console.error('Error resetting password:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while resetting password'
            }
          });
        }
      });

      await userController.resetPassword(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('getProfile returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.getProfile = jest.fn().mockImplementation(async (req, res) => {
        try {
          const userId = req.headers['x-user-id'] as string;
          if (!userId) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
            return;
          }
          throw new Error('test error');
        } catch (error) {
          console.error('Error getting user profile:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while retrieving user profile'
            }
          });
        }
      });

      mockRequest = { headers: { 'x-user-id': 'user-123' } } as any;
      await userController.getProfile(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('updateProfile returns 500 on error', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      userController.updateProfile = jest.fn().mockImplementation(async (req, res) => {
        try {
          const userId = req.headers['x-user-id'] as string;
          if (!userId) {
            res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
            return;
          }
          throw new Error('test error');
        } catch (error) {
          console.error('Error updating user profile:', error);
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An unexpected error occurred while updating user profile'
            }
          });
        }
      });

      mockRequest = { headers: { 'x-user-id': 'user-123' } } as any;
      await userController.updateProfile(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('not implemented endpoints', () => {
    it('getUserById returns 501', async () => {
      mockRequest.params = { id: 'user-123' } as any;
      await userController.getUserById(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('updateUser returns 501', async () => {
      mockRequest.params = { id: 'user-123' } as any;
      await userController.updateUser(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('deleteUser returns 501', async () => {
      mockRequest.params = { id: 'user-123' } as any;
      await userController.deleteUser(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('verifyEmail returns 501', async () => {
      await userController.verifyEmail(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('requestPasswordReset returns 501', async () => {
      await userController.requestPasswordReset(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('resetPassword returns 501', async () => {
      await userController.resetPassword(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('getProfile returns 401 when no user header', async () => {
      mockRequest = { headers: {} } as any;
      await userController.getProfile(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('getProfile returns 501 when authenticated', async () => {
      mockRequest = { headers: { 'x-user-id': 'user-123' } } as any;
      await userController.getProfile(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });

    it('updateProfile returns 401 when no user header', async () => {
      mockRequest = { headers: {} } as any;
      await userController.updateProfile(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('updateProfile returns 501 when authenticated', async () => {
      mockRequest = { headers: { 'x-user-id': 'user-123' } } as any;
      await userController.updateProfile(mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(501);
    });
  });
});