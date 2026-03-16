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
    private readonly baseUrl: string;
    private readonly bulkSMSMode?: number;
    private readonly enqueue?: number;
    private readonly keyword?: string;
    private readonly linkId?: string;
    private readonly retryDurationInHours?: number;
    private readonly isSandbox: boolean;

    private static readonly LIVE_BASE_URL = 'https://api.africastalking.com/version1';
    private static readonly SANDBOX_BASE_URL = 'https://api.sandbox.africastalking.com/version1';

    constructor(config: {
        username: string;
        apiKey: string;
        senderId?: string;
        environment?: 'live' | 'sandbox';
        baseUrl?: string;
        bulkSMSMode?: number;
        enqueue?: number;
        keyword?: string;
        linkId?: string;
        retryDurationInHours?: number;
    }) {
        this.username = config.username;
        this.apiKey = config.apiKey;
        this.senderId = config.senderId;
        this.bulkSMSMode = config.bulkSMSMode;
        this.enqueue = config.enqueue;
        this.keyword = config.keyword;
        this.linkId = config.linkId;
        this.retryDurationInHours = config.retryDurationInHours;
        this.isSandbox = config.environment === 'sandbox';
        const defaultBaseUrl = this.isSandbox
            ? AfricasTalkingSmsProvider.SANDBOX_BASE_URL
            : AfricasTalkingSmsProvider.LIVE_BASE_URL;
        this.baseUrl = (config.baseUrl || defaultBaseUrl).replace(/\/+$/, '');
    }

    async send(phoneNumber: string, message: string): Promise<ProviderResponse> {
        try {
            const urlencoded = new URLSearchParams();
            urlencoded.append('username', this.username);
            urlencoded.append('to', phoneNumber);
            urlencoded.append('message', message);
            if (this.senderId && !this.isSandbox) {
                urlencoded.append('from', this.senderId);
            }
            if (this.bulkSMSMode !== undefined) {
                urlencoded.append('bulkSMSMode', String(this.bulkSMSMode));
            }
            if (this.enqueue !== undefined) {
                urlencoded.append('enqueue', String(this.enqueue));
            }
            if (this.keyword) {
                urlencoded.append('keyword', this.keyword);
            }
            if (this.linkId) {
                urlencoded.append('linkId', this.linkId);
            }
            if (this.retryDurationInHours !== undefined) {
                urlencoded.append('retryDurationInHours', String(this.retryDurationInHours));
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

            const raw = await response.text();
            let data: any = null;
            if (raw) {
                try {
                    data = JSON.parse(raw);
                } catch {
                    // Non-JSON response (XML or plain text)
                    data = this.tryParseXmlResponse(raw);
                }
            }

            if (!response.ok) {
                return ProviderResponse.createFailure(
                    (data && (data.message || data.error)) || raw || 'Africa\'s Talking API error',
                    response.status.toString()
                );
            }

            if (!data) {
                return ProviderResponse.createFailure(
                    raw || 'Africa\'s Talking API error',
                    response.status.toString()
                );
            }

            // Check if message was sent
            const recipients = data.SMSMessageData?.Recipients || [];
            if (recipients.length === 0) {
                const apiMessage = data.SMSMessageData?.Message || data.message || data.error;
                return ProviderResponse.createFailure(
                    apiMessage || 'No recipients processed',
                    '400'
                );
            }

            const recipient = recipients[0];

            const statusCode = Number(recipient.statusCode);
            const isSuccessCode = statusCode === 100 || statusCode === 101 || statusCode === 102;
            if (recipient.status === 'Success' || isSuccessCode) {
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

    private tryParseXmlResponse(xml: string): any | null {
        try {
            if (!xml.includes('<SMSMessageData')) {
                return null;
            }

            const getTagValue = (tag: string): string | undefined => {
                const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
                return match?.[1]?.trim();
            };

            const status = getTagValue('status');
            const statusCodeRaw = getTagValue('statusCode');
            const messageId = getTagValue('messageId');
            const number = getTagValue('number');
            const cost = getTagValue('cost');

            if (!status && !statusCodeRaw) {
                return null;
            }

            const statusCode = statusCodeRaw ? Number(statusCodeRaw) : undefined;

            return {
                SMSMessageData: {
                    Message: getTagValue('Message'),
                    Recipients: [
                        {
                            cost,
                            messageId,
                            number,
                            status: status || 'Unknown',
                            statusCode
                        }
                    ]
                }
            };
        } catch {
            return null;
        }
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
            if (!body || typeof body !== 'object') {
                return null;
            }

            const providerMessageId = body.id;
            const providerStatus = body.status;
            const phoneNumber = body.phoneNumber;

            if (
                typeof providerMessageId !== 'string' || providerMessageId.length === 0 ||
                typeof providerStatus !== 'string' || providerStatus.length === 0 ||
                typeof phoneNumber !== 'string' || phoneNumber.length === 0
            ) {
                return null;
            }

            return {
                providerMessageId,
                status: providerStatus === 'Success' ? 'delivered' : 'failed',
                phoneNumber,
                failureReason: body.failureReason
            };
        } catch {
            return null;
        }
    }
}
