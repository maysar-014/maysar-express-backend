import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const AnalyticsModule: Module = {
    name: 'analytics-service',
    initialize: async () => {
        console.log('Initializing analytics-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down analytics-service module');
    }
};
