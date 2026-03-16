import { SmsStatus } from '../../domain/entities/sms-message.entity';
import { ISmsRepository } from '../../domain/repositories/sms.repository';
import type { DeliveryReport } from '../../infrastructure/providers/sms-provider.interface';

export interface DeliveryReportProvider {
    getName(): string;
    parseDeliveryReport?(body: unknown): DeliveryReport | null;
}

export interface DeliveryReportResult {
    parsed: boolean;
    accepted: boolean;
    status?: SmsStatus;
    messageId?: string;
    providerMessageId?: string;
    reason?: string;
}

/**
 * Handle Delivery Report Use Case
 * Parses provider delivery reports and updates message status
 */
export class HandleDeliveryReportUseCase {
    constructor(
        private readonly repository: ISmsRepository,
        private readonly provider: DeliveryReportProvider
    ) {}

    async execute(payload: unknown): Promise<DeliveryReportResult> {
        if (!this.provider.parseDeliveryReport) {
            return {
                parsed: false,
                accepted: false,
                reason: 'Provider does not support delivery reports'
            };
        }

        const normalizedPayload = this.normalizePayload(payload);
        const parsed = this.provider.parseDeliveryReport(normalizedPayload);
        if (!parsed) {
            return {
                parsed: false,
                accepted: false,
                reason: 'Invalid delivery report payload'
            };
        }

        const message = await this.repository.findByProviderMessageId(
            this.provider.getName(),
            parsed.providerMessageId
        );

        if (!message) {
            return {
                parsed: true,
                accepted: false,
                providerMessageId: parsed.providerMessageId,
                reason: 'Message not found'
            };
        }

        const currentStatus = message.getStatus();
        if (parsed.status === 'delivered') {
            if (currentStatus === SmsStatus.DELIVERED) {
                return {
                    parsed: true,
                    accepted: true,
                    status: currentStatus,
                    messageId: message.getId(),
                    providerMessageId: parsed.providerMessageId
                };
            }

            if (currentStatus !== SmsStatus.SENT) {
                return {
                    parsed: true,
                    accepted: false,
                    status: currentStatus,
                    messageId: message.getId(),
                    providerMessageId: parsed.providerMessageId,
                    reason: `Cannot mark delivered from ${currentStatus}`
                };
            }

            message.markAsDelivered();
            await this.repository.update(message);

            return {
                parsed: true,
                accepted: true,
                status: message.getStatus(),
                messageId: message.getId(),
                providerMessageId: parsed.providerMessageId
            };
        }

        if (currentStatus === SmsStatus.UNDELIVERED || currentStatus === SmsStatus.FAILED) {
            return {
                parsed: true,
                accepted: true,
                status: currentStatus,
                messageId: message.getId(),
                providerMessageId: parsed.providerMessageId
            };
        }

        if (currentStatus !== SmsStatus.SENT) {
            return {
                parsed: true,
                accepted: false,
                status: currentStatus,
                messageId: message.getId(),
                providerMessageId: parsed.providerMessageId,
                reason: `Cannot mark undelivered from ${currentStatus}`
            };
        }

        message.markAsUndelivered(parsed.failureReason);
        await this.repository.update(message);

        return {
            parsed: true,
            accepted: true,
            status: message.getStatus(),
            messageId: message.getId(),
            providerMessageId: parsed.providerMessageId
        };
    }

    private normalizePayload(payload: unknown): unknown {
        if (typeof payload !== 'string') {
            return payload;
        }

        const trimmed = payload.trim();
        if (!trimmed) {
            return payload;
        }

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return payload;
            }
        }

        if (trimmed.includes('=')) {
            const params = new URLSearchParams(trimmed);
            return Object.fromEntries(params.entries());
        }

        return payload;
    }
}
