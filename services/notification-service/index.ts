import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const NotificationModule: Module = {
    name: 'notification-service',
    initialize: async () => {
        console.log('Initializing notification-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down notification-service module');
    }
};
