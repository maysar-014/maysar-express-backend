import { eventBus } from '@shared-events/eventBus';

console.log('Compliance Service started successfully');
console.log('Monitoring KYC compliance only');

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down Compliance Service...');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
