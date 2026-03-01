import { createApp } from './app';
import { tracingService } from '../../../shared/tracing/openTelemetry';

// Initialize Tracing
tracingService.start();

const PORT = process.env.PORT || 3010;

async function bootstrap() {
    const app = createApp();

    app.listen(PORT, () => {
        console.log(`Training Service running on port ${PORT}`);
    });
}

bootstrap().catch(err => {
    console.error('Failed to start Training Service:', err);
    process.exit(1);
});
