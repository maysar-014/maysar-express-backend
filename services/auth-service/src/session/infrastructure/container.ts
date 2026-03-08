import 'reflect-metadata';
import { Container } from 'inversify';

// Placeholder types
export const TYPES = {
    PrismaClient: Symbol.for('PrismaClient'),
    EventBus: Symbol.for('EventBus'),
};

export const container = new Container();

// Initial bindings
// container.bind<PrismaClient>(TYPES.PrismaClient).toConstantValue(new PrismaClient());
