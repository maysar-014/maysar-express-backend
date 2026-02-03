import { Container } from '../infrastructure/container';
import { createApp } from '../app';

const PORT = process.env.PORT || 3010;

async function bootstrap() {
    // Obtain the container instance
    Container.getInstance();

    // Create and start the application
    const app = createApp();

    app.listen(PORT, () => {
        console.log(`✅ Training Service started on port ${PORT}`);
    });
}

bootstrap().catch(err => {
    console.error('Failed to start Training Service:', err);
    process.exit(1);
});
