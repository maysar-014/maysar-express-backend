import { TracingService } from '../../../../../shared/tracing/openTelemetry';

// Start tracing before loading other modules that might be instrumented
const tracingService = new TracingService('campaign-service');
tracingService.start();

import { container } from '../infrastructure/container';
import { createServer } from '../app';
import { initializeCacheService } from '../../infrastructure/services/cache.bootstrap';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    initializeCacheService();
    const app = createServer(container);

    const server = app.listen(PORT, () => {
        console.log(`✅ Campaign Service started on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down...');
        server.close(async () => {
            await tracingService.stop();
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

bootstrap().catch(console.error);

