// DEPRECATED: Session is now served by auth-service main.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import { SessionServiceApplication } from './app';
import { logger } from './infrastructure/services/logger.service';

async function bootstrap() {
    const container = new Container();
    // Bind your dependencies here
    // container.bind<ISessionRepository>(TYPES.SessionRepository).to(PrismaSessionRepository);

    const port = parseInt(process.env.PORT || '3007', 10);
    const app = new SessionServiceApplication(container);

    try {
        await app.start(port);
    } catch (error) {
        logger.error('Failed to start Session Service', { error });
        process.exit(1);
    }
}

bootstrap();
