import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const TwoFactorModule: Module = {
    name: 'two-factor-service',
    initialize: async () => {
        console.log('Initializing two-factor-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down two-factor-service module');
    }
};
