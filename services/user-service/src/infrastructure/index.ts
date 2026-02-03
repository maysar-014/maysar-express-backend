/**
 * Infrastructure Layer
 * Exports all infrastructure components for the User Service
 */

// Repositories
export { UserRepository, InMemoryUserRepository, DatabaseUserRepository } from './repositories/user.repository';

// Services
export { CacheService } from './services/cache.service';
export { EmailService } from './services/email.service';

// Adapters
export { UserEventPublisher } from './messaging/user-event-publisher';

