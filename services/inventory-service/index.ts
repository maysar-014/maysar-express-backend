import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const InventoryModule: Module = {
    name: 'inventory-service',
    initialize: async () => {
        console.log('Initializing inventory-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down inventory-service module');
    }
};
