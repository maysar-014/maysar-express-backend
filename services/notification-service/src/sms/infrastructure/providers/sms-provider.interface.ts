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

    /**
     * Parse delivery report payloads (optional)
     */
    parseDeliveryReport?(body: unknown): DeliveryReport | null;
}

export type DeliveryReport = {
    providerMessageId: string;
    status: 'delivered' | 'failed';
    phoneNumber: string;
    failureReason?: string;
};
