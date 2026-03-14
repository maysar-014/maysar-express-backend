import request from 'supertest';
import express from 'express';
import { createAuthRoutes } from '../auth.routes';
import { AuthController } from '../../controllers/auth.controller';
import type { RegisterUserUseCase } from '../../../application/use-cases/register-user.use-case';
import type { AuthenticateUserUseCase } from '../../../application/use-cases/authenticate-user.use-case';
import { logger } from '../../../infrastructure/services/logger.service';

// Mock logger to prevent console noise
jest.mock('../../../infrastructure/services/logger.service', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

// Mock UseCases to prevent side effects from imports
jest.mock('../../../application/use-cases/register-user.use-case');
jest.mock('../../../application/use-cases/authenticate-user.use-case');

describe('Auth Routes Integration', () => {
    let app: express.Application;
    let mockRegisterUseCase: jest.Mocked<RegisterUserUseCase>;
    let mockAuthenticateUseCase: jest.Mocked<AuthenticateUserUseCase>;
    let authController: AuthController;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock UseCases
        // We cast to unknown first to avoid strict type checking against private properties if any
        mockRegisterUseCase = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<RegisterUserUseCase>;

        mockAuthenticateUseCase = {
            execute: jest.fn(),
        } as unknown as jest.Mocked<AuthenticateUserUseCase>;

        // Initialize controller with mocks
        authController = new AuthController(
            mockRegisterUseCase,
            mockAuthenticateUseCase
        );

        // Setup Express App
        app = express();
        app.use(express.json());
        app.use('/api/v1/auth', createAuthRoutes(authController));
    });

    describe('POST /api/v1/auth/login', () => {
        const loginData = {
            email: 'test@example.com',
            password: 'password123',
        };

        it('should authenticate user successfully', async () => {
            // Arrange
            const mockResult = {
                success: true,
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 'user-1', email: 'test@example.com', role: 'buyer' } as any,
                message: 'Authentication successful',
            };
            mockAuthenticateUseCase.execute.mockResolvedValue(mockResult);

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResult);
            expect(mockAuthenticateUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
                email: loginData.email,
                password: loginData.password,
            }));
        });

        it('should return 401 on failed authentication', async () => {
            // Arrange
            const mockResult = {
                success: false,
                message: 'Invalid credentials',
            };
            mockAuthenticateUseCase.execute.mockResolvedValue(mockResult);

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData);

            // Assert
            expect(response.status).toBe(401);
            expect(response.body).toEqual(mockResult);
        });

        it('should return 400 when request body is invalid', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'invalid-email', password: 'short' }); // Invalid email format & short password

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Validation failed');
        });

        it('should handle internal server errors', async () => {
            // Arrange
            mockAuthenticateUseCase.execute.mockRejectedValue(new Error('Internal error'));

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send(loginData);

            // Assert
            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('should logout successfully', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .send({ refreshToken: 'valid-token' });

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should require refresh token', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .send({});

            // Assert
            expect(response.status).toBe(400);
        });
    });

    // Add more tests as needed for other endpoints
});
