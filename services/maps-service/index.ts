import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const MapsModule: Module = {
    name: 'maps-service',
    initialize: async () => {
        console.log('Initializing maps-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down maps-service module');
    }
};
