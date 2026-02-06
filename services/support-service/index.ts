import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const SupportModule: Module = {
    name: 'support-service',
    initialize: async () => {
        console.log('Initializing support-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down support-service module');
    }
};
