import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { createPrismaClient } from '@shared/database/prisma-client';

const port = process.env.PORT || 3001;
import { AuthController } from './src/api/controllers/auth.controller';
import { RegisterUserUseCase } from './src/application/use-cases/register-user.use-case';
import { AuthenticateUserUseCase } from './src/application/use-cases/authenticate-user.use-case';
import { createAuthRoutes } from './src/api/routes/auth.routes';
import { adminRoutes } from './src/api/routes/admin.routes';
import { authMiddlewareRoutes } from './src/api/routes/auth-middleware.routes';
import { googleOAuthRoutes } from './src/api/routes/google-oauth.routes';
import { healthRoutes as authHealthRoutes } from './src/api/routes/health.routes';
import { createMaintenanceRoutes } from './src/api/routes/maintenance.routes';
import { UserServiceRepository } from './src/infrastructure/repositories/user-service.repository';
import { getUserServiceClient } from './src/infrastructure/services/service-discovery';
import { UserSyncEventHandlers } from './src/infrastructure/events/user-sync.event-handlers';
import { AuthEventPublisher } from './src/infrastructure/messaging/auth-event-publisher';
import { OutboxRepository } from '@shared/outbox/outbox.repository';

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
import { healthRoutes as sessionHealthRoutes } from './src/session/api/routes/health.routes';
import { SessionEngine } from './src/domain/engines/session.engine';
import { PrismaClient } from '@prisma/client';
import { healthRoutes as twoFactorHealthRoutes } from './src/2fa/api/routes/health.routes';
import { requireRoleOrService } from '@shared/middleware/auth-context.middleware';
import { createSwitchRoleRouter } from './src/api/routes/switch-role.routes';
import { createOtpVerificationRouter } from './src/api/routes/otp-verification.routes';
import { createRoleRequestRouter } from './src/api/routes/role-request.routes';

const authPrisma = createPrismaClient();
const authOutboxRepository = new OutboxRepository(authPrisma, 'sharedOutboxEvent');
const authEventPublisher = new AuthEventPublisher(authOutboxRepository);


export const AuthModule: Module = {
    name: 'auth-service',
    initialize: async () => {
        console.log('Initializing auth-service module (fully merged)');

        // Initialize auth dependencies
        try {
            const userServiceClient = getUserServiceClient();
            const userRepository = new UserServiceRepository(userServiceClient!) as any;

            const registerUseCase = new RegisterUserUseCase(userRepository);
            const authUseCase = new AuthenticateUserUseCase(userRepository, authEventPublisher);

            const controller = new AuthController(registerUseCase, authUseCase);

            const userSyncHandlers = new UserSyncEventHandlers(authPrisma);
            userSyncHandlers.registerHandlers();

            // Create router
            AuthModule.routes = createAuthRoutes(controller) as any;

            // Initialize two-factor dependency graph
            const encryptionService = new EncryptionService(process.env.TWO_FACTOR_ENCRYPTION_KEY || 'default-two-factor-encryption-key-32-chars!!');

            const twoFactorRepository = new PrismaTwoFactorRepository(authPrisma, encryptionService);
            const qrCodeService = new QRCodeService();

            const setupTwoFactorUseCase = new SetupTwoFactorUseCase(twoFactorRepository, qrCodeService);
            const verifyTwoFactorSetupUseCase = new VerifyTwoFactorSetupUseCase(twoFactorRepository, authEventPublisher);
            const verifyTwoFactorLoginUseCase = new VerifyTwoFactorLoginUseCase(twoFactorRepository);
            const verifyBackupCodeUseCase = new VerifyBackupCodeUseCase(twoFactorRepository);
            const disableTwoFactorUseCase = new DisableTwoFactorUseCase(twoFactorRepository, authEventPublisher);
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
            mainRouter.use('/2fa/health', twoFactorHealthRoutes);

            const sessionEngine = new SessionEngine();
            mainRouter.use('/sessions', createSessionRouter(sessionEngine));
            mainRouter.use('/sessions/health', sessionHealthRoutes);
            mainRouter.use('/', createSwitchRoleRouter(sessionEngine));
            mainRouter.use('/', createOtpVerificationRouter(verifyTwoFactorLoginUseCase));
            mainRouter.use('/', createRoleRequestRouter(authPrisma));

            // Additional auth route groups (previously unmounted)
            mainRouter.use('/admin', adminRoutes);
            mainRouter.use('/', authMiddlewareRoutes);
            mainRouter.use('/oauth', googleOAuthRoutes);
            mainRouter.use('/health', authHealthRoutes);
            mainRouter.use('/system/maintenance', requireRoleOrService(['admin', 'system']), createMaintenanceRoutes(authPrisma));

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
            const { TwoFactorServiceModule } = await import('./src/2fa/index');
            if (TwoFactorServiceModule && TwoFactorServiceModule.shutdown) {
                await TwoFactorServiceModule.shutdown();
            }
        } catch (e) {
            console.warn('Two-factor shutdown error:', e);
        }
    }
};


