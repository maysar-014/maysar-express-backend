import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

// SMS service integration
let smsRoutes: Router | null = null;
try {
    const { createSmsRouter } = require('./src/sms/api/routes');
    smsRoutes = createSmsRouter();
} catch (e) {
    console.warn('SMS routes not available:', e);
}

export const NotificationModule: Module = {
    name: 'notification-service',
    initialize: async () => {
        console.log('Initializing notification-service module (fully merged)');

        // Initialize SMS service
        try {
            const { SmsModule } = require('./src/sms/index');
            if (SmsModule && SmsModule.initialize) {
                await SmsModule.initialize();
                console.log('SMS service initialized');
            }
        } catch (e) {
            console.warn('SMS service not initialized:', e);
        }
    },
    routes: (() => {
        const router = Router();

        // Mount SMS routes under /sms
        if (smsRoutes) {
            router.use('/sms', smsRoutes);
        }

        // Health checks
        router.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'notification-service',
                modules: ['notification', 'sms'],
                timestamp: new Date().toISOString()
            });
        });

        return router;
    })(),
    shutdown: async () => {
        console.log('Shutting down notification-service module');
        try {
            const { SmsModule } = require('./src/sms/index');
            if (SmsModule && SmsModule.shutdown) {
                await SmsModule.shutdown();
            }
        } catch (e) {
            console.warn('SMS shutdown error:', e);
        }
    }
};
