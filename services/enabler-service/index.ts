import { Module } from '../../src/core/module.interface';
import { appLogger } from '../../shared/logger/logger';
import apiRouter from './src/api/routes';

export const EnablerModule: Module = {
    name: 'enabler-service',
    initialize: async () => {
        appLogger.info('Initializing enabler-service module');
    },
    routes: apiRouter,
    shutdown: async () => {
        appLogger.info('Shutting down enabler-service module');
    }
};
