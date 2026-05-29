import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createGovernanceServiceEnvironment } from './bootstrap';
import { createGovernanceRoutes } from './api/routes/governance.routes';

async function bootstrap(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT ?? '3020');
  const { config, controller } = createGovernanceServiceEnvironment();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'governance-service',
      port,
      targetBaseUrl: config.targetBaseUrl
    });
  });

  app.use('/api/governance', createGovernanceRoutes(controller));

  app.listen(port, () => {
    console.log(`Governance Service running on port ${port}`);
  });
}

void bootstrap();
