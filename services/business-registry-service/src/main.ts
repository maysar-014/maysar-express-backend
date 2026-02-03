import express from 'express';
import { createApiRouter } from './api';
import { config } from './config';
import { logger } from './infrastructure/services/logger.service';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(createApiRouter());

app.listen(config.port, () => {
  logger.info(`Business Registry Service running on port ${config.port}`, {
    port: config.port,
    nodeEnv: config.nodeEnv
  });
});

export default app;
