import { ISmsProvider } from '../sms-provider.interface';
import { ProviderResponse } from '../../../domain/value-objects/provider-response.value-object';

/**
 * Test SMS Provider
 * Simulates SMS sending for tests without external API calls.
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
        await this.delay(100);

        if (this.shouldFail || Math.random() < this.failureRate) {
            return ProviderResponse.createFailure(
                'Test provider: Simulated failure',
                '500'
            );
        }

        const providerMessageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.sentMessages.set(providerMessageId, {
            phoneNumber,
            message,
            sentAt: new Date(),
            status: 'sent'
        });

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

    getSentMessages(): Map<string, any> {
        return new Map(this.sentMessages);
    }

    clearSentMessages(): void {
        this.sentMessages.clear();
    }

    setShouldFail(shouldFail: boolean): void {
        this.shouldFail = shouldFail;
    }

    setFailureRate(rate: number): void {
        this.failureRate = Math.max(0, Math.min(1, rate));
    }

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
