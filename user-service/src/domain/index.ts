// Domain exports
export * from './interfaces';
export * from './types/user.types';
export * from './entities/user.entity';
export * from './value-objects/email.value-object';
export * from './value-objects/phone-number.value-object';
export * from './value-objects/address.value-object';
export * from './services/user-validation.service';
export * from './policies/user-security.policy';

// Re-export Address type to avoid conflicts
export { Address as AddressType } from './types/user.types';
