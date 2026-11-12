/**
 * Maysar Engineering — Degradation Service Registration
 * 
 * Registers non-critical services with the degradation manager.
 * Called during application bootstrap.
 */

import { degradationManager } from './degradation-manager';

export function registerDegradationServices(): void {
  // Non-critical services - degradation is acceptable
  degradationManager.registerService({
    name: 'meilisearch',
    isCritical: false,
    checkIntervalMs: 30000, // 30 seconds
    failureThreshold: 3,
    recoveryThreshold: 2,
    timeoutMs: 5000,
    fallbackEnabled: true,
  });

  degradationManager.registerService({
    name: 'minio',
    isCritical: false,
    checkIntervalMs: 30000,
    failureThreshold: 3,
    recoveryThreshold: 2,
    timeoutMs: 5000,
    fallbackEnabled: true,
  });

  degradationManager.registerService({
    name: 'email-service',
    isCritical: false,
    checkIntervalMs: 60000, // 1 minute
    failureThreshold: 3,
    recoveryThreshold: 2,
    timeoutMs: 10000,
    fallbackEnabled: true,
  });

  degradationManager.registerService({
    name: 'redis',
    isCritical: true, // Redis is critical for caching and sessions
    checkIntervalMs: 15000, // 15 seconds
    failureThreshold: 3,
    recoveryThreshold: 2,
    timeoutMs: 5000,
    fallbackEnabled: false,
  });

  degradationManager.registerService({
    name: 'postgresql',
    isCritical: true, // PostgreSQL is critical for data persistence
    checkIntervalMs: 15000,
    failureThreshold: 3,
    recoveryThreshold: 2,
    timeoutMs: 10000,
    fallbackEnabled: false,
  });

  degradationManager.registerService({
    name: 'payment-gateway',
    isCritical: true, // Payment gateway is critical for financial transactions
    checkIntervalMs: 30000,
    failureThreshold: 2,
    recoveryThreshold: 2,
    timeoutMs: 10000,
    fallbackEnabled: false,
  });

  console.log('Degradation services registered');
}
