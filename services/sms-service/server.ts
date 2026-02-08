import 'reflect-metadata';
import { SmsServiceApplication } from './app';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PORT = parseInt(process.env.SMS_SERVICE_PORT || '3006', 10);

async function bootstrap() {
    try {
        const service = new SmsServiceApplication();
        await service.start(PORT);

        // Handle graceful shutdown
        const shutdown = () => {
            console.log('Shutting down SMS Service...');
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (error) {
        console.error('Failed to start SMS Service:', error);
        process.exit(1);
    }
}

bootstrap();
