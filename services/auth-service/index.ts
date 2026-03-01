import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';

const port = process.env.PORT || 3001;
import { AuthController } from './src/api/controllers/auth.controller';
import { RegisterUserUseCase } from './src/application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './src/application/use-cases/authenticate-user.use-case';
import { createAuthRoutes } from './src/api/routes/auth.routes';
import { UserServiceRepository } from './src/infrastructure/repositories/user-service.repository';
import { getUserServiceClient } from './src/infrastructure/services/service-discovery';

// 2FA Imports
import { EncryptionService } from './src/2fa/infrastructure/services/encryption.service';
import { PrismaTwoFactorRepository } from './src/2fa/infrastructure/repositories/prisma-two-factor.repository';
import { SetupTwoFactorUseCase } from './src/2fa/application/use-cases/setup-two-factor.use-case';
import { VerifyTwoFactorSetupUseCase } from './src/2fa/application/use-cases/verify-two-factor-setup.use-case';
import { VerifyTwoFactorLoginUseCase } from './src/2fa/application/use-cases/verify-two-factor-login.use-case';
import { VerifyBackupCodeUseCase } from './src/2fa/application/use-cases/verify-backup-code.use-case';
import { DisableTwoFactorUseCase } from './src/2fa/application/use-cases/disable-two-factor.use-case';
import { RegenerateBackupCodesUseCase } from './src/2fa/application/use-cases/regenerate-backup-codes.use-case';
import { GetTwoFactorStatusUseCase } from './src/2fa/application/use-cases/get-two-factor-status.use-case';
import { TwoFactorController } from './src/2fa/api/controllers/two-factor.controller';
import { createTwoFactorRouter } from './src/2fa/api/routes/two-factor.routes';
import { QRCodeService } from './src/2fa/infrastructure/services/qr-code.service';

// Session Imports
import { createSessionRouter } from './src/session/api/routes/session.routes';
import { SessionEngine } from './src/domain/engines/session.engine';
import { PrismaClient } from '@prisma/client';

const authPrisma = new PrismaClient();


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

            // Initialize two-factor dependency graph
            const encryptionService = new EncryptionService(process.env.TWO_FACTOR_ENCRYPTION_KEY || 'default-two-factor-encryption-key-32-chars!!');

            const twoFactorRepository = new PrismaTwoFactorRepository(authPrisma, encryptionService);
            const qrCodeService = new QRCodeService();

            const setupTwoFactorUseCase = new SetupTwoFactorUseCase(twoFactorRepository, qrCodeService);
            const verifyTwoFactorSetupUseCase = new VerifyTwoFactorSetupUseCase(twoFactorRepository);
            const verifyTwoFactorLoginUseCase = new VerifyTwoFactorLoginUseCase(twoFactorRepository);
            const verifyBackupCodeUseCase = new VerifyBackupCodeUseCase(twoFactorRepository);
            const disableTwoFactorUseCase = new DisableTwoFactorUseCase(twoFactorRepository);
            const regenerateBackupCodesUseCase = new RegenerateBackupCodesUseCase(twoFactorRepository);
            const getTwoFactorStatusUseCase = new GetTwoFactorStatusUseCase(twoFactorRepository);

            const twoFactorController = new TwoFactorController(
                setupTwoFactorUseCase,
                verifyTwoFactorSetupUseCase,
                verifyTwoFactorLoginUseCase,
                verifyBackupCodeUseCase,
                disableTwoFactorUseCase,
                regenerateBackupCodesUseCase,
                getTwoFactorStatusUseCase
            );

            // Mount routers
            const mainRouter = AuthModule.routes as Router;
            mainRouter.use('/2fa', createTwoFactorRouter(twoFactorController));

            const sessionEngine = new SessionEngine();
            mainRouter.use('/sessions', createSessionRouter(sessionEngine));

            console.log('Consolidated 2FA and Session routes mounted successfully');


            console.log('Auth-service routes mounted successfully');
            logger.info(`Auth Service starting on port ${port}...`);
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
