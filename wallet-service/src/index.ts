import { createApp } from './app';
import { config } from './config/config';
import { Container } from './container';

async function startServer() {
    const app = createApp();
    const container = Container.getInstance();

    try {
        await container.prisma.$connect();
        console.log('✅ Connected to database');

        app.listen(config.port, () => {
            console.log(`🚀 Wallet Service running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
