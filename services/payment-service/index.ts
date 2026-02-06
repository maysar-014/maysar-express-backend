import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const PaymentModule: Module = {
    name: 'payment-service',
    initialize: async () => {
        console.log('Initializing payment-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down payment-service module');
    }
};
