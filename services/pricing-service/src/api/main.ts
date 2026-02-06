import { createApp } from '../app';
import { logger } from '../infrastructure/services/logger.service';

const PORT = process.env.PORT || 3009;

const app = createApp();

app.listen(PORT, () => {
    logger.info(`Pricing Service running on port ${PORT}`);
});
