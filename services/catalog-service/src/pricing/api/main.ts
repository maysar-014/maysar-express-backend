import { TracingService } from '../../../../../shared/tracing/openTelemetry';

// Start tracing before loading other modules that might be instrumented
const tracingService = new TracingService('pricing-service');
tracingService.start();

import { createApp } from '../app';
import { logger } from '../infrastructure/services/logger.service';

const PORT = process.env.PORT || 3009;

const app = createApp();

const server = app.listen(PORT, () => {
    logger.info(`Pricing Service running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down...');
    server.close(async () => {
        await tracingService.stop();
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

