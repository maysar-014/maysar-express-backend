import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const CatalogModule: Module = {
    name: 'catalog-service',
    initialize: async () => {
        console.log('Initializing catalog-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down catalog-service module');
    }
};
