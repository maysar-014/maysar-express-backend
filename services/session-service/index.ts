import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const SessionModule: Module = {
    name: 'session-service',
    initialize: async () => {
        console.log('Initializing session-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down session-service module');
    }
};
