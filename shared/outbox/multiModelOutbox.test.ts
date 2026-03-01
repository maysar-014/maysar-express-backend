import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from './outboxPattern';
import { PrismaOutboxRepository } from './outbox.repository';
import { v4 as uuidv4 } from 'uuid';

describe('Generalized Outbox Infrastructure', () => {
    let prisma: PrismaClient;

    beforeAll(() => {
        prisma = new PrismaClient();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should be able to initialize TransactionalOutbox with different model names', () => {
        const orderOutbox = new TransactionalOutbox(prisma, 'order_OutboxEvent');
        const catalogOutbox = new TransactionalOutbox(prisma, 'catalogOutboxEvent');
        const inventoryOutbox = new TransactionalOutbox(prisma, 'inventory_OutboxEvent');
        const defaultOutbox = new TransactionalOutbox(prisma);

        expect(orderOutbox).toBeDefined();
        expect(catalogOutbox).toBeDefined();
        expect(inventoryOutbox).toBeDefined();
        expect(defaultOutbox).toBeDefined();
    });

    it('should throw error if model name does not exist', () => {
        expect(() => new TransactionalOutbox(prisma, 'nonExistentModel' as any))
            .toThrow('Prisma model nonExistentModel not found in client');
    });

    it('should be able to initialize PrismaOutboxRepository with different model names', () => {
        const repo = new PrismaOutboxRepository(prisma, 'order_OutboxEvent');
        expect(repo).toBeDefined();
    });
});
