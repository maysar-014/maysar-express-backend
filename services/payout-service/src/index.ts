import { createApp } from './app';
import { config } from './config/config';
import { Container } from './container';
import { tracingService } from '../../../shared/tracing/openTelemetry';

// Initialize Tracing
tracingService.start();

async function startServer() {
    const app = createApp();
    const container = Container.getInstance();

    try {
        await container.prisma.$connect();
        console.log('✅ Connected to database');

        container.outboxProcessor.start();
        console.log('✅ Outbox processor started');

        app.listen(config.port, () => {
            console.log(`🚀 Payout Service running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
        });

        const shutdown = async () => {
            console.log('\n🛑 Shutting down gracefully...');
            container.outboxProcessor.stop();
            await container.prisma.$disconnect();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
