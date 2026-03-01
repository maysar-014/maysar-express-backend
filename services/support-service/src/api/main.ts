import { container } from '../infrastructure/container';
import { createServer } from '../app';
import { tracingService } from '../../../../shared/tracing/openTelemetry';

// Initialize Tracing
tracingService.start();

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    const app = createServer(container);

    app.listen(PORT, () => {
        console.log(`✅ Support Service started on port ${PORT}`);
    });
}

bootstrap().catch(console.error);
