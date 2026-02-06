import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const AuthModule: Module = {
    name: 'auth-service',
    initialize: async () => {
        console.log('Initializing auth-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down auth-service module');
    }
};
