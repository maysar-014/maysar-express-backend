import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { logger } from './src/infrastructure/services/logger.service';
import { initializeEventRegistry } from '../../shared/events/registry';

export const UserModule: Module = {
    name: 'user-service',
    initialize: async () => {
        logger.info('Initializing user-service module');
        initializeEventRegistry();
    },
    routes: Router(),
    shutdown: async () => {
        logger.info('Shutting down user-service module');
    }
};
