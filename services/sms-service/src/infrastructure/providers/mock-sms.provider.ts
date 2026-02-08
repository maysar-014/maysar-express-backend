import { ISmsProvider } from './sms-provider.interface';
import { ProviderResponse } from '../../domain/value-objects/provider-response.value-object';

/**
 * Mock SMS Provider
 * For testing and development - simulates SMS sending without external API calls
 */
export class MockSmsProvider implements ISmsProvider {
    private readonly name = 'mock';
    private readonly sentMessages: Map<string, any> = new Map();
    private shouldFail: boolean = false;
    private failureRate: number = 0;

    constructor(options?: { shouldFail?: boolean; failureRate?: number }) {
        this.shouldFail = options?.shouldFail ?? false;
        this.failureRate = options?.failureRate ?? 0;
    }

    async send(phoneNumber: string, message: string): Promise<ProviderResponse> {
        // Simulate network delay
        await this.delay(100);

        // Simulate random failures based on failure rate
        if (this.shouldFail || Math.random() < this.failureRate) {
            return ProviderResponse.createFailure(
                'Mock provider: Simulated failure',
                '500'
            );
        }

        // Generate mock provider message ID
        const providerMessageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store message (for testing purposes)
        this.sentMessages.set(providerMessageId, {
            phoneNumber,
            message,
            sentAt: new Date(),
            status: 'sent'
        });

        // Log for debugging
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[MockSmsProvider] Sent SMS to ${phoneNumber}: ${message.substring(0, 50)}...`);
        }

        return ProviderResponse.createSuccess(providerMessageId, {
            provider: this.name,
            phoneNumber,
            messageLength: message.length
        });
    }

    async getStatus(providerMessageId: string): Promise<ProviderResponse> {
        await this.delay(50);

        const message = this.sentMessages.get(providerMessageId);

        if (!message) {
            return ProviderResponse.createFailure(`Message not found: ${providerMessageId}`, '404');
        }

        // Simulate delivery after 1 second
        const sentAt = message.sentAt.getTime();
        const now = Date.now();
        const delivered = now - sentAt > 1000;

        return ProviderResponse.create({
            providerMessageId,
            status: delivered ? 'delivered' : 'queued',
            timestamp: new Date(),
            metadata: { message }
        });
    }

    getName(): string {
        return this.name;
    }

    async isHealthy(): Promise<boolean> {
        return true;
    }

    getConfig() {
        return {
            name: this.name,
            maxMessageLength: 1600,
            supportsDeliveryReports: true,
            supportsBatch: true
        };
    }

    // ==================== Testing Utilities ====================

    /**
     * Get all sent messages (for testing)
     */
    getSentMessages(): Map<string, any> {
        return new Map(this.sentMessages);
    }

    /**
     * Clear sent messages (for testing)
     */
    clearSentMessages(): void {
        this.sentMessages.clear();
    }

    /**
     * Set failure mode (for testing)
     */
    setShouldFail(shouldFail: boolean): void {
        this.shouldFail = shouldFail;
    }

    /**
     * Set failure rate (for testing)
     */
    setFailureRate(rate: number): void {
        this.failureRate = Math.max(0, Math.min(1, rate));
    }

    /**
     * Simulate message delivery (for testing)
     */
    simulateDelivery(providerMessageId: string): void {
        const message = this.sentMessages.get(providerMessageId);
        if (message) {
            message.status = 'delivered';
            message.deliveredAt = new Date();
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
