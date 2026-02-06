import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const PermissionModule: Module = {
    name: 'permission-service',
    initialize: async () => {
        console.log('Initializing permission-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down permission-service module');
    }
};
