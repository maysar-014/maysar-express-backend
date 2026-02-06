import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const WalletModule: Module = {
    name: 'wallet-service',
    initialize: async () => {
        console.log('Initializing wallet-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down wallet-service module');
    }
};
