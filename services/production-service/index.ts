import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const ProductionModule: Module = {
    name: 'production-service',
    initialize: async () => {
        console.log('Initializing production-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down production-service module');
    }
};
