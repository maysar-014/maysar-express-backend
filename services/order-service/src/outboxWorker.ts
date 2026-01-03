import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { OutboxPublisher } from '../../../shared/outbox/outboxPublisher';
import { enhancedEventBus } from '../../../src/events/eventBus';

const prisma = new PrismaClient();
const outbox = new TransactionalOutbox(prisma);
const publisher = new OutboxPublisher(outbox, enhancedEventBus);

// Start the outbox publisher
publisher.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down outbox publisher...');
  publisher.stop();
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down outbox publisher...');
  publisher.stop();
  prisma.$disconnect();
  process.exit(0);
});

console.log('Order service outbox publisher started');