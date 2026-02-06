import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const CommunityModule: Module = {
    name: 'community-service',
    initialize: async () => {
        console.log('Initializing community-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down community-service module');
    }
};
