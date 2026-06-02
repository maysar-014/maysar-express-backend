import { ISmsProvider } from './sms-provider.interface';
import { ProviderResponse } from '../../domain/value-objects/provider-response.value-object';

export interface MesejiSmsProviderConfig {
    apiKey?: string;
    senderId?: string;
    baseUrl?: string;
}

/**
 * Meseji SMS provider placeholder.
 *
 * This is intentionally non-networked for now so the app can ship without
 * depending on a live external SMS API until the Meseji contract is confirmed.
 */
export class MesejiSmsProvider implements ISmsProvider {
    private readonly name = 'meseji';
    private readonly apiKey?: string;
    private readonly senderId?: string;
    private readonly baseUrl?: string;

    constructor(config: MesejiSmsProviderConfig = {}) {
        this.apiKey = config.apiKey;
        this.senderId = config.senderId;
        this.baseUrl = config.baseUrl;
    }

    async send(_phoneNumber: string, _message: string): Promise<ProviderResponse> {
        return ProviderResponse.create({
            providerMessageId: '',
            status: 'rejected',
            statusCode: '501',
            errorMessage: 'Meseji SMS provider is not enabled yet',
            timestamp: new Date(),
            metadata: {
                provider: this.name,
                senderId: this.senderId,
                baseUrl: this.baseUrl || undefined
            }
        });
    }

    async getStatus(providerMessageId: string): Promise<ProviderResponse> {
        return ProviderResponse.create({
            providerMessageId,
            status: 'unknown',
            timestamp: new Date(),
            metadata: {
                provider: this.name,
                note: 'Delivery status will be wired when the Meseji API contract is finalized'
            }
        });
    }

    getName(): string {
        return this.name;
    }

    async isHealthy(): Promise<boolean> {
        return false;
    }

    getConfig() {
        return {
            name: this.name,
            maxMessageLength: 1600,
            supportsDeliveryReports: false,
            supportsBatch: false
        };
    }

    parseDeliveryReport(): null {
        return null;
    }
}
