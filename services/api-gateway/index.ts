import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const ApiGatewayModule: Module = {
    name: 'api-gateway',
    initialize: async () => {
        console.log('Initializing api-gateway module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down api-gateway module');
    }
};
