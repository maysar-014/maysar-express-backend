import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const CampaignModule: Module = {
    name: 'campaign-service',
    initialize: async () => {
        console.log('Initializing campaign-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down campaign-service module');
    }
};
