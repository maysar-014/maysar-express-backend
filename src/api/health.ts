import { Router } from 'express';
import { moduleRegistry } from '../core/module-registry';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
    const health = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        modules: moduleRegistry.getModules().map(m => m.name)
    };

    res.json(health);
});

healthRouter.get('/liveness', (req, res) => {
    res.status(200).send('OK');
});
