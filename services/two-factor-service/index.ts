import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

// Repositories
import { PrismaTwoFactorRepository } from './src/infrastructure/repositories/prisma-two-factor.repository';

// Services
import { EncryptionService } from './src/infrastructure/services/encryption.service';
import { QRCodeService } from './src/infrastructure/services/qr-code.service';
import { EventPublisher } from './src/infrastructure/messaging/event-publisher';

// Use Cases
import { SetupTwoFactorUseCase } from './src/application/use-cases/setup-two-factor.use-case';
import { VerifyTwoFactorSetupUseCase } from './src/application/use-cases/verify-two-factor-setup.use-case';
import { VerifyTwoFactorLoginUseCase } from './src/application/use-cases/verify-two-factor-login.use-case';
import { VerifyBackupCodeUseCase } from './src/application/use-cases/verify-backup-code.use-case';
import { DisableTwoFactorUseCase } from './src/application/use-cases/disable-two-factor.use-case';
import { RegenerateBackupCodesUseCase } from './src/application/use-cases/regenerate-backup-codes.use-case';
import { GetTwoFactorStatusUseCase } from './src/application/use-cases/get-two-factor-status.use-case';

// Controller & Routes
import { TwoFactorController } from './src/api/controllers/two-factor.controller';
import { createTwoFactorRouter } from './src/api/routes/two-factor.routes';

export class TwoFactorServiceModule {
    public static serviceName = 'TwoFactorService';
    private static controller: TwoFactorController;
    public static routes: Router;

    /**
     * Initializes the 2FA service and its dependencies.
     */
    public static async initialize(): Promise<void> {
        const prisma = new PrismaClient();

        // Infrastructure
        const encryptionKey = process.env.ENCRYPTION_KEY || 'default-super-secret-key-32-chars-!!';
        const encryptionService = new EncryptionService(encryptionKey);
        const qrCodeService = new QRCodeService();
        const eventPublisher = new EventPublisher();

        // Repository
        const repository = new PrismaTwoFactorRepository(prisma, encryptionService);

        // Use Cases
        const setupUseCase = new SetupTwoFactorUseCase(repository, qrCodeService);
        const verifySetupUseCase = new VerifyTwoFactorSetupUseCase(repository);
        const verifyLoginUseCase = new VerifyTwoFactorLoginUseCase(repository);
        const verifyBackupUseCase = new VerifyBackupCodeUseCase(repository);
        const disableUseCase = new DisableTwoFactorUseCase(repository);
        const regenerateBackupUseCase = new RegenerateBackupCodesUseCase(repository);
        const getStatusUseCase = new GetTwoFactorStatusUseCase(repository);

        // Controller
        this.controller = new TwoFactorController(
            setupUseCase,
            verifySetupUseCase,
            verifyLoginUseCase,
            verifyBackupUseCase,
            disableUseCase,
            regenerateBackupUseCase,
            getStatusUseCase
        );

        this.routes = createTwoFactorRouter(this.controller);

        console.log('TwoFactorService initialized successfully.');
    }

    /**
     * Graceful shutdown
     */
    public static async shutdown(): Promise<void> {
        console.log('TwoFactorService shutting down...');
    }
}

export default TwoFactorServiceModule;
