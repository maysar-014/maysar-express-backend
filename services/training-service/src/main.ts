import { createApp } from './app';

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
