import { Router, Request, Response } from 'express';
import { circuitBreakerRegistry } from '../../infrastructure/circuit-breaker';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
    try {
        const circuitBreakerHealth = circuitBreakerRegistry.getHealthSummary();

        const isHealthy = circuitBreakerHealth.unhealthy === 0;

        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'degraded',
            service: 'maps-service',
            timestamp: new Date().toISOString(),
            circuitBreakers: circuitBreakerHealth,
            details: {
                providers: {
                    routing: true,
                    tracking: true,
                    traffic: true,
                    weather: true
                }
            }
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'maps-service',
            error: (error as Error).message,
            timestamp: new Date().toISOString()
        });
    }
});

healthRouter.get('/ready', async (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ready',
        service: 'maps-service',
        timestamp: new Date().toISOString()
    });
});

healthRouter.get('/live', async (req: Request, res: Response) => {
    res.status(200).json({
        status: 'alive',
        service: 'maps-service',
        timestamp: new Date().toISOString()
    });
});
