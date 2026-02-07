import { ProviderResponse } from '../../domain/value-objects/provider-response.value-object';

/**
 * SMS Provider Interface
 * Contract for SMS provider implementations
 */
export interface ISmsProvider {
    /**
     * Send an SMS message
     */
    send(phoneNumber: string, message: string): Promise<ProviderResponse>;

    /**
     * Get delivery status from provider
     */
    getStatus(providerMessageId: string): Promise<ProviderResponse>;

    /**
     * Get provider name/identifier
     */
    getName(): string;

    /**
     * Check if provider is healthy and available
     */
    isHealthy(): Promise<boolean>;

    /**
     * Get provider configuration
     */
    getConfig(): {
        name: string;
        maxMessageLength: number;
        supportsDeliveryReports: boolean;
        supportsBatch: boolean;
    };
}
