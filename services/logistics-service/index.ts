import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';

export const LogisticsModule: Module = {
    name: 'logistics-service',
    initialize: async () => {
        logger.info('Initializing logistics-service module');
    },
    routes: Router(),
    shutdown: async () => {
        logger.info('Shutting down logistics-service module');
    }
};
