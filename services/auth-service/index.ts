import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { AuthController } from './src/api/controllers/auth.controller';
import { RegisterUserUseCase } from './src/application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './src/application/use-cases/authenticate-user.use-case';
import { createAuthRoutes } from './src/api/routes/auth.routes';
import { UserServiceRepository } from './src/infrastructure/repositories/user-service.repository';
import { getUserServiceClient } from './src/infrastructure/services/service-discovery';

export const AuthModule: Module = {
    name: 'auth-service',
    initialize: async () => {
        console.log('Initializing auth-service module');

        // Initialize dependencies
        try {
            const userServiceClient = getUserServiceClient();
            const userRepository = new UserServiceRepository(userServiceClient!) as any;

            const registerUseCase = new RegisterUserUseCase(userRepository);
            const authUseCase = new AuthenticateUserUseCase(userRepository);

            const controller = new AuthController(registerUseCase, authUseCase);

            // Create router
            AuthModule.routes = createAuthRoutes(controller) as any;
            console.log('Auth-service routes mounted successfully');
        } catch (error) {
            console.error('Failed to initialize auth-service:', error);
            // Fallback to empty router to prevent crash, but log error
            AuthModule.routes = Router();
        }
    },
    routes: Router(), // Initial stub, replaced in initialize
    shutdown: async () => {
        console.log('Shutting down auth-service module');
    }
};
