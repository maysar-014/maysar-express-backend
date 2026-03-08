import { ISmsProvider } from './sms-provider.interface';
import { ProviderResponse } from '../../domain/value-objects/provider-response.value-object';

/**
 * Africa's Talking SMS Provider
 * Integration with Africa's Talking SMS API
 * https://developers.africastalking.com/docs/sms
 */
export class AfricasTalkingSmsProvider implements ISmsProvider {
    private readonly name = 'africastalking';
    private readonly username: string;
    private readonly apiKey: string;
    private readonly senderId?: string;
    private readonly baseUrl = 'https://api.africastalking.com/version1';

    constructor(config: {
        username: string;
        apiKey: string;
        senderId?: string;
    }) {
        this.username = config.username;
        this.apiKey = config.apiKey;
        this.senderId = config.senderId;
    }

    async send(phoneNumber: string, message: string): Promise<ProviderResponse> {
        try {
            const urlencoded = new URLSearchParams();
            urlencoded.append('username', this.username);
            urlencoded.append('to', phoneNumber);
            urlencoded.append('message', message);
            if (this.senderId) {
                urlencoded.append('from', this.senderId);
            }

            const response = await fetch(`${this.baseUrl}/messaging`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apiKey': this.apiKey,
                    'Accept': 'application/json'
                },
                body: urlencoded
            });

            const data: any = await response.json();

            if (!response.ok) {
                return ProviderResponse.createFailure(
                    data.message || 'Africa\'s Talking API error',
                    response.status.toString()
                );
            }

            // Check if message was sent
            const recipients = data.SMSMessageData?.Recipients || [];
            if (recipients.length === 0) {
                return ProviderResponse.createFailure(
                    'No recipients processed',
                    '400'
                );
            }

            const recipient = recipients[0];

            if (recipient.status === 'Success' || recipient.statusCode === 101) {
                return ProviderResponse.createSuccess(recipient.messageId, {
                    provider: this.name,
                    phoneNumber,
                    cost: recipient.cost,
                    statusCode: recipient.statusCode
                });
            } else {
                return ProviderResponse.createFailure(
                    recipient.status || 'Message rejected',
                    recipient.statusCode?.toString()
                );
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return ProviderResponse.createFailure(
                `Africa's Talking error: ${errorMessage}`,
                '500'
            );
        }
    }

    async getStatus(providerMessageId: string): Promise<ProviderResponse> {
        // Africa's Talking doesn't have a direct status query endpoint
        // Status updates come via delivery reports callback
        return ProviderResponse.create({
            providerMessageId,
            status: 'unknown',
            timestamp: new Date(),
            metadata: {
                note: 'Status delivered via callback'
            }
        });
    }

    getName(): string {
        return this.name;
    }

    async isHealthy(): Promise<boolean> {
        try {
            // Simple health check - try to fetch account balance
            const response = await fetch(`${this.baseUrl}/user?username=${this.username}`, {
                method: 'GET',
                headers: {
                    'apiKey': this.apiKey,
                    'Accept': 'application/json'
                }
            });

            return response.ok;
        } catch {
            return false;
        }
    }

    getConfig() {
        return {
            name: this.name,
            maxMessageLength: 1600,
            supportsDeliveryReports: true,
            supportsBatch: true
        };
    }

    /**
     * Handle delivery report callback
     * Should be called from webhook endpoint
     */
    parseDeliveryReport(body: any): {
        providerMessageId: string;
        status: 'delivered' | 'failed';
        phoneNumber: string;
        failureReason?: string;
    } | null {
        try {
            return {
                providerMessageId: body.id,
                status: body.status === 'Success' ? 'delivered' : 'failed',
                phoneNumber: body.phoneNumber,
                failureReason: body.failureReason
            };
        } catch {
            return null;
        }
    }
}
