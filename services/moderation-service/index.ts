import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const ModerationModule: Module = {
    name: 'moderation-service',
    initialize: async () => {
        console.log('Initializing moderation-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down moderation-service module');
    }
};
