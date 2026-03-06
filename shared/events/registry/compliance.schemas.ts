import { EventSchema, eventRegistry } from './base';

export const KYCStatusChangedSchema: EventSchema = {
  eventType: 'KYCStatusChanged',
  version: 'v1',
  validate(data) {
    const errors: string[] = [];
    if (!data.userId) errors.push('userId is required');
    if (!data.newStatus) errors.push('newStatus is required');
    return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
  }
};

export const registerComplianceSchemas = () => {
  eventRegistry.register(KYCStatusChangedSchema);
};
