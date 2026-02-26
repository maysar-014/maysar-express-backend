import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { AuthController } from './src/api/controllers/auth.controller';
import { RegisterUserUseCase } from './src/application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './src/application/use-cases/authenticate-user.use-case';
import { createAuthRoutes } from './src/api/routes/auth.routes';
import { UserServiceRepository } from './src/infrastructure/repositories/user-service.repository';
import { getUserServiceClient } from './src/infrastructure/services/service-discovery';

// Two-factor service integration
let twoFactorRoutes: Router | null = null;
try {
    const TwoFactorServiceModule = require('./src/2fa/index').default || require('./src/2fa/index').TwoFactorServiceModule || require('./index').TwoFactorServiceModule;
    // Note: Since we moved files, we might need to adjust where the module is exported from
    // For now, let's try to load it from the new local path index if it exists
} catch (e) {
    console.warn('Two-factor routes not available:', e);
}

// Session service integration
let sessionRoutes: Router | null = null;
try {
    const { sessionRouter } = require('./src/session/api/routes');
    sessionRoutes = sessionRouter;
} catch (e) {
    console.warn('Session routes not available:', e);
}

export const AuthModule: Module = {
    name: 'auth-service',
    initialize: async () => {
        console.log('Initializing auth-service module (fully merged)');

        // Initialize auth dependencies
        try {
            const userServiceClient = getUserServiceClient();
            const userRepository = new UserServiceRepository(userServiceClient!) as any;

            const registerUseCase = new RegisterUserUseCase(userRepository);
            const authUseCase = new AuthenticateUserUseCase(userRepository);

            const controller = new AuthController(registerUseCase, authUseCase);

            // Create router
            AuthModule.routes = createAuthRoutes(controller) as any;

            // Initialize two-factor
            try {
                const { TwoFactorServiceModule } = require('./src/2fa/index');
                if (TwoFactorServiceModule && TwoFactorServiceModule.initialize) {
                    await TwoFactorServiceModule.initialize();
                    if (TwoFactorServiceModule.routes) {
                        (AuthModule.routes as Router).use('/2fa', TwoFactorServiceModule.routes);
                        console.log('Two-factor routes mounted at /2fa');
                    }
                }
            } catch (e) {
                // Try alternate require for 2fa
                try {
                    const { createTwoFactorRouter } = require('./src/2fa/api/routes');
                    twoFactorRoutes = createTwoFactorRouter();
                    if (twoFactorRoutes) {
                        (AuthModule.routes as Router).use('/2fa', twoFactorRoutes);
                        console.log('Two-factor routes mounted manually');
                    }
                } catch (e2) {
                    console.warn('Two-factor service not initialized:', e2);
                }
            }

            // Mount session routes
            if (sessionRoutes) {
                (AuthModule.routes as Router).use('/session', sessionRoutes);
                console.log('Session routes mounted at /session');
            }

            console.log('Auth-service routes mounted successfully');
        } catch (error) {
            console.error('Failed to initialize auth-service:', error);
            AuthModule.routes = Router();
        }
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down auth-service module');
        try {
            const { TwoFactorServiceModule } = require('./src/2fa/index');
            if (TwoFactorServiceModule && TwoFactorServiceModule.shutdown) {
                await TwoFactorServiceModule.shutdown();
            }
        } catch (e) {
            console.warn('Two-factor shutdown error:', e);
        }
    }
};
