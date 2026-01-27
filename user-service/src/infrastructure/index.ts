/**
 * Infrastructure Layer
 * Exports all infrastructure components for the User Service
 */

// Repositories
export { UserRepository, InMemoryUserRepository, DatabaseUserRepository } from './repositories/user.repository';

// Services
export { CacheService } from './services/cache.service';
export { EmailService } from './services/email.service';
export { SMSService } from './services/sms.service';
export { FileStorageService } from './services/file-storage.service';
export { NotificationService } from './services/notification.service';
export { SecurityService } from './services/security.service';
export { AuditService } from './services/audit.service';

// Providers
export { MessagingProvider } from './providers/messaging.provider';
export { ExternalAPIClient } from './providers/external-api-client';

// Adapters
export { UserEventPublisher } from './adapters/user-event-publisher';
export { UserEventSubscriber } from './adapters/user-event-subscriber';

// Infrastructure Factory
export { InfrastructureFactory } from './infrastructure.factory';