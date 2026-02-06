import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const CommissionModule: Module = {
    name: 'commission-service',
    initialize: async () => {
        console.log('Initializing commission-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down commission-service module');
    }
};
