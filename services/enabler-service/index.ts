import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const EnablerModule: Module = {
    name: 'enabler-service',
    initialize: async () => {
        console.log('Initializing enabler-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down enabler-service module');
    }
};
