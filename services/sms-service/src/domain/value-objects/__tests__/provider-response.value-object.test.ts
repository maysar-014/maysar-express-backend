import { ProviderResponse } from '../provider-response.value-object';

describe('ProviderResponse Value Object', () => {
    describe('create', () => {
        it('should create success response', () => {
            const response = ProviderResponse.createSuccess('msg-123', { cost: 0.5 });
            expect(response.isSuccess()).toBe(true);
            expect(response.getProviderMessageId()).toBe('msg-123');
            expect(response.getStatus()).toBe('accepted');
        });

        it('should create failure response', () => {
            const response = ProviderResponse.createFailure('Invalid number', '400');
            expect(response.isFailure()).toBe(true);
            expect(response.getErrorMessage()).toBe('Invalid number');
            expect(response.getStatusCode()).toBe('400');
        });

        it('should validate props', () => {
            expect(() => ProviderResponse.create({
                providerMessageId: '',
                status: 'accepted',
                timestamp: new Date()
            })).toThrow('Provider message ID is required');
        });
    });

    describe('status checks', () => {
        it('should identify retryable errors', () => {
            const rateLimit = ProviderResponse.createFailure('Too many requests', '429');
            expect(rateLimit.isRetryable()).toBe(true);

            const invalidNumber = ProviderResponse.createFailure('Bad request', '400');
            expect(invalidNumber.isRetryable()).toBe(false);
        });

        it('should get status description', () => {
            const accepted = ProviderResponse.createSuccess('id');
            expect(accepted.getStatusDescription()).toContain('accepted');

            const failed = ProviderResponse.createFailure('Error');
            expect(failed.getStatusDescription()).toContain('Delivery failed');
        });
    });
});
