import request from 'supertest';
import express from 'express';
import { createUserRoutes } from '../user.routes';
import { UserController } from '../../controllers/user.controller';
import { CreateUserUseCase } from '../../../application/use-cases/create-user.use-case';

// Mock using relative paths to avoid resolution issues during test loading
jest.mock('../../controllers/user.controller');
jest.mock('../../../application/use-cases/create-user.use-case');
jest.mock('../../../application/sagas/saga-event-handler');

describe('User Routes Integration', () => {
  let app: express.Application;
  let mockUserController: jest.Mocked<UserController>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Mock Controller instance
    // The route file initializes new UserController(...) inside initializeController
    // Since we mocked the CLASS, new UserController() returns a loose mock object.
    // We need to ensure that the methods called by routes exist on the prototype or instance.

    // We can spy on the mock constructor to get the instance
    // But since createUserRoutes calls new UserController internally, we need to ensure the mock implementation
    // has the methods.

    // Define methods on the mock prototype or implementation
    (UserController as unknown as jest.Mock).mockImplementation(() => ({
      createUser: jest.fn((req, res) => res.status(201).json({ id: 'user-1' })),
      getUserById: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
      updateUser: jest.fn((req, res) => res.status(200).json({ id: req.params.id })),
      deleteUser: jest.fn((req, res) => res.status(204).send()),
      verifyEmail: jest.fn((req, res) => res.status(200).json({ success: true })),
      requestPasswordReset: jest.fn((req, res) => res.status(200).json({ success: true })),
      resetPassword: jest.fn((req, res) => res.status(200).json({ success: true })),
      getProfile: jest.fn((req, res) => res.status(200).json({ id: 'user-1' })),
      updateProfile: jest.fn((req, res) => res.status(200).json({ id: 'user-1' })),
      changePassword: jest.fn((req, res) => res.status(200).json({ success: true })),
      suspendAccount: jest.fn((req, res) => res.status(200).json({ success: true })),
      changeRole: jest.fn((req, res) => res.status(200).json({ success: true })),
      verifyPhone: jest.fn((req, res) => res.status(200).json({ success: true })),
      setupTwoFactor: jest.fn((req, res) => res.status(200).json({ success: true })),
      reportSecurityBreach: jest.fn((req, res) => res.status(200).json({ success: true })),
    }));

    app = express();
    app.use(express.json());
    try {
      app.use('/api/users', createUserRoutes()); // This triggers internal initialization
    } catch (error: any) {
      console.error('FAILED TO INITIALIZE ROUTES:', error);
      throw error;
    }
  });

  describe('POST /api/users', () => {
    it('should create user successfully', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'test@example.com',
          phoneNumber: '+255712345678',
          firstName: 'Test',
          lastName: 'User',
          role: 'buyer'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: 'user-1' });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const response = await request(app)
        .get('/api/users/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV')
        .set('x-contract-test', '1')
        .set('x-user-id', 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV' });
    });
  });
});
