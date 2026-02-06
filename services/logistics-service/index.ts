import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const LogisticsModule: Module = {
    name: 'logistics-service',
    initialize: async () => {
        console.log('Initializing logistics-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down logistics-service module');
    }
};
