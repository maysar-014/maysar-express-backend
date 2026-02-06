import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const CheckoutModule: Module = {
    name: 'checkout-service',
    initialize: async () => {
        console.log('Initializing checkout-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down checkout-service module');
    }
};
