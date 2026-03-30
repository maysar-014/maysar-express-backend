/**
 * Provider Response Value Object
 * Encapsulates the response from an SMS provider
 */

export type ProviderStatus = 'accepted' | 'rejected' | 'queued' | 'delivered' | 'failed' | 'unknown';

export interface ProviderResponseProps {
    providerMessageId: string;
    status: ProviderStatus;
    statusCode?: string;
    errorMessage?: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export class ProviderResponse {
    private readonly providerMessageId: string;
    private readonly status: ProviderStatus;
    private readonly statusCode?: string;
    private readonly errorMessage?: string;
    private readonly timestamp: Date;
    private readonly metadata?: Record<string, unknown>;

    private constructor(props: ProviderResponseProps) {
        this.providerMessageId = props.providerMessageId;
        this.status = props.status;
        this.statusCode = props.statusCode;
        this.errorMessage = props.errorMessage;
        this.timestamp = props.timestamp;
        this.metadata = props.metadata;
    }

    static create(props: ProviderResponseProps): ProviderResponse {
        this.validate(props);
        return new ProviderResponse(props);
    }

    static createSuccess(providerMessageId: string, metadata?: Record<string, unknown>): ProviderResponse {
        return new ProviderResponse({
            providerMessageId,
            status: 'accepted',
            timestamp: new Date(),
            metadata
        });
    }

    static createFailure(errorMessage: string, statusCode?: string): ProviderResponse {
        return new ProviderResponse({
            providerMessageId: '',
            status: 'rejected',
            statusCode,
            errorMessage,
            timestamp: new Date()
        });
    }

    private static validate(props: ProviderResponseProps): void {
        if (props.status === 'accepted' && !props.providerMessageId) {
            throw new Error('Provider message ID is required for accepted status');
        }

        if (props.status === 'rejected' && !props.errorMessage) {
            throw new Error('Error message is required for rejected status');
        }
    }

    getProviderMessageId(): string {
        return this.providerMessageId;
    }

    getStatus(): ProviderStatus {
        return this.status;
    }

    getStatusCode(): string | undefined {
        return this.statusCode;
    }

    getErrorMessage(): string | undefined {
        return this.errorMessage;
    }

    getTimestamp(): Date {
        return this.timestamp;
    }

    getMetadata(): Record<string, unknown> | undefined {
        return this.metadata;
    }

    isSuccess(): boolean {
        return this.status === 'accepted' || this.status === 'queued' || this.status === 'delivered';
    }

    isFailure(): boolean {
        return this.status === 'rejected' || this.status === 'failed';
    }

    isPending(): boolean {
        return this.status === 'queued';
    }

    isDelivered(): boolean {
        return this.status === 'delivered';
    }

    /**
     * Check if the response indicates a temporary error that can be retried
     */
    isRetryable(): boolean {
        if (!this.isFailure()) return false;

        const retryableStatusCodes = [
            '429', // Rate limit
            '500', // Internal server error
            '502', // Bad gateway
            '503', // Service unavailable
            '504'  // Gateway timeout
        ];

        return this.statusCode ? retryableStatusCodes.includes(this.statusCode) : false;
    }

    /**
     * Get human-readable status description
     */
    getStatusDescription(): string {
        switch (this.status) {
            case 'accepted':
                return 'Message accepted by provider';
            case 'rejected':
                return `Message rejected: ${this.errorMessage || 'Unknown error'}`;
            case 'queued':
                return 'Message queued for delivery';
            case 'delivered':
                return 'Message delivered successfully';
            case 'failed':
                return `Delivery failed: ${this.errorMessage || 'Unknown error'}`;
            default:
                return 'Unknown status';
        }
    }

    toJSON(): Record<string, unknown> {
        return {
            providerMessageId: this.providerMessageId,
            status: this.status,
            statusCode: this.statusCode,
            errorMessage: this.errorMessage,
            timestamp: this.timestamp.toISOString(),
            metadata: this.metadata
        };
    }
}
