import 'reflect-metadata';
import { Container } from 'inversify';
import { MapsServiceApplication } from './app';
import { logger } from './infrastructure/services/logger.service';
import { tracingService } from '../../../shared/tracing/openTelemetry';

// Initialize Tracing
tracingService.start();

async function bootstrap() {
    const container = new Container();
    const port = parseInt(process.env.PORT || '3011', 10);
    const app = new MapsServiceApplication(container);

    try {
        await app.start(port);
    } catch (error) {
        logger.error('Failed to start Maps Service', { error });
        process.exit(1);
    }
}

bootstrap();
