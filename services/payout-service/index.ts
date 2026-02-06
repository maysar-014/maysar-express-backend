import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const PayoutModule: Module = {
    name: 'payout-service',
    initialize: async () => {
        console.log('Initializing payout-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down payout-service module');
    }
};
