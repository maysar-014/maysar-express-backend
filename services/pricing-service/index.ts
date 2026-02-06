import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const PricingModule: Module = {
    name: 'pricing-service',
    initialize: async () => {
        console.log('Initializing pricing-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down pricing-service module');
    }
};
