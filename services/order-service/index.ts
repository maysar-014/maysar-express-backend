import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const OrderModule: Module = {
    name: 'order-service',
    initialize: async () => {
        console.log('Initializing order-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down order-service module');
    }
};
