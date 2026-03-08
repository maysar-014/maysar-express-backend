import { EventSchema, eventRegistry } from './base';

interface KYCStatusChangedData {
  userId?: string;
  newStatus?: string;
}

const asRecord = (data: unknown): Record<string, unknown> =>
  typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};

const asKYCStatusChangedData = (data: unknown): KYCStatusChangedData => {
  const parsed = asRecord(data);
  return {
    userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
    newStatus: typeof parsed.newStatus === 'string' ? parsed.newStatus : undefined
  };
};

export const KYCStatusChangedSchema: EventSchema<KYCStatusChangedData> = {
  eventType: 'KYCStatusChanged',
  version: 'v1',
  validate(data) {
    const payload = asKYCStatusChangedData(data);
    const errors: string[] = [];
    if (!payload.userId) errors.push('userId is required');
    if (!payload.newStatus) errors.push('newStatus is required');
    return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
  }
};

export const registerComplianceSchemas = () => {
  eventRegistry.register(KYCStatusChangedSchema);
};
