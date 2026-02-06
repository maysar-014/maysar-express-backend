import { Router } from 'express';
import { Module } from '../../src/core/module.interface';

export const TrainingModule: Module = {
    name: 'training-service',
    initialize: async () => {
        console.log('Initializing training-service module');
    },
    routes: Router(),
    shutdown: async () => {
        console.log('Shutting down training-service module');
    }
};
