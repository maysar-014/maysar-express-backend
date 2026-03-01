// DEPRECATED: 2FA is now served by auth-service main.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import { TwoFactorServiceApplication } from './app';
import { logger } from './infrastructure/services/logger.service';

async function bootstrap() {
    const container = new Container();
    const port = parseInt(process.env.PORT || '3010', 10);
    const app = new TwoFactorServiceApplication(container);

    try {
        await app.start(port);
    } catch (error) {
        logger.error('Failed to start Two-Factor Service', { error });
        process.exit(1);
    }
}

bootstrap();
