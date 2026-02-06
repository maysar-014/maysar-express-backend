import 'reflect-metadata';
import { Container } from 'inversify';
import { PermissionServiceApplication } from './app';
import { logger } from './infrastructure/services/logger.service';

async function bootstrap() {
    const container = new Container();
    const port = parseInt(process.env.PORT || '3008', 10);
    const app = new PermissionServiceApplication(container);

    try {
        await app.start(port);
    } catch (error) {
        logger.error('Failed to start Permission Service', { error });
        process.exit(1);
    }
}

bootstrap();
