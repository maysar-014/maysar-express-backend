import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const ComplianceModule: Module = {
    name: 'compliance-service',
    initialize: async () => {
        console.log('Initializing compliance-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down compliance-service module');
    }
};
