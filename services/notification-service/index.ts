import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';

import { createSmsRouter } from './src/sms/api/routes';


export const NotificationModule: Module = {
    name: 'notification-service',
    initialize: async () => {
        logger.info('Initializing notification-service module (fully merged)');

        // Initialize SMS service
        try {
            const { SmsModule } = require('./src/sms/index');
            if (SmsModule && SmsModule.initialize) {
                await SmsModule.initialize();
                logger.info('SMS service initialized');
            }
        } catch (e) {
            logger.warn('SMS service not initialized:', e);
        }
    },
    routes: (() => {
        const router = Router();

        // Mount SMS routes under /sms
        router.use('/sms', createSmsRouter());


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
        logger.info('Shutting down notification-service module');
        try {
            const { SmsModule } = require('./src/sms/index');
            if (SmsModule && SmsModule.shutdown) {
                await SmsModule.shutdown();
            }
        } catch (e) {
            logger.warn('SMS shutdown error:', e);
        }
    }
};
