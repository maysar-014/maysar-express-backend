import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const UserModule: Module = {
    name: 'user-service',
    initialize: async () => {
        console.log('Initializing user-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down user-service module');
    }
};
