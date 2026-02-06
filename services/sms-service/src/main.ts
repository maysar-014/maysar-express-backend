import 'reflect-metadata';
import { Container } from 'inversify';
import { SmsServiceApplication } from './app';
import { logger } from './infrastructure/services/logger.service';

async function bootstrap() {
    const container = new Container();
    const port = parseInt(process.env.PORT || '3009', 10);
    const app = new SmsServiceApplication(container);

    try {
        await app.start(port);
    } catch (error) {
        logger.error('Failed to start SMS Service', { error });
        process.exit(1);
    }
}

bootstrap();
