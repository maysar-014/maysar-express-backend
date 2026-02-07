import 'reflect-metadata';
import { Container } from 'inversify';

import { prisma } from './database/prisma-client';
import { eventBus } from '@shared/events/eventBus';
import { PrismaClient } from '@prisma/client';

// Placeholder types
export const TYPES = {
    PrismaClient: Symbol.for('PrismaClient'),
    EventBus: Symbol.for('EventBus'),
};

export const container = new Container();

// Initial bindings
container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(prisma);
container.bind(TYPES.EventBus).toConstantValue(eventBus);
