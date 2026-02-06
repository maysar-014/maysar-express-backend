import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const BusinessRegistryModule: Module = {
    name: 'business-registry-service',
    initialize: async () => {
        console.log('Initializing business-registry-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down business-registry-service module');
    }
};
