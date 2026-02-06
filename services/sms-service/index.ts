import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const SmsModule: Module = {
    name: 'sms-service',
    initialize: async () => {
        console.log('Initializing sms-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down sms-service module');
    }
};
