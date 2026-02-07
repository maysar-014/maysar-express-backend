import { container } from '../infrastructure/container';
import { createServer } from '../app';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
    const app = createServer(container);

    app.listen(PORT, () => {
        console.log(`✅ Campaign Service started on port ${PORT}`);
    });
}

bootstrap().catch(console.error);
