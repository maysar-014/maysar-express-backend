import 'reflect-metadata';
import express from 'express';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';

export function createServer(container: Container) {
    const server = new InversifyExpressServer(container);

    server.setConfig((app) => {
        app.use(express.json());
    });

    return server.build();
}
