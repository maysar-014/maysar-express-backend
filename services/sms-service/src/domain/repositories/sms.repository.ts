import { SmsMessage, SmsStatus } from '../entities/sms-message.entity';

/**
 * SMS Repository Interface (Port)
 * Defines the contract for SMS message persistence
 * Infrastructure layer will implement this interface
 */
export interface ISmsRepository {
    /**
     * Create a new SMS message
     */
    create(message: SmsMessage): Promise<SmsMessage>;

    /**
     * Find SMS message by ID
     */
    findById(id: string): Promise<SmsMessage | null>;

    /**
     * Find SMS messages by status
     */
    findByStatus(status: SmsStatus, limit?: number): Promise<SmsMessage[]>;

    /**
     * Find SMS messages by user ID
     */
    findByUserId(userId: string, limit?: number): Promise<SmsMessage[]>;

    /**
     * Find SMS messages by phone number
     */
    findByPhoneNumber(phoneNumber: string, limit?: number): Promise<SmsMessage[]>;

    /**
     * Find failed messages eligible for retry
     */
    findFailedMessagesForRetry(maxRetries: number): Promise<SmsMessage[]>;

    /**
     * Update an existing SMS message
     */
    update(message: SmsMessage): Promise<SmsMessage>;

    /**
     * Delete an SMS message (soft delete if applicable)
     */
    delete(id: string): Promise<void>;

    /**
     * Get count of messages sent in a time window (for rate limiting)
     */
    getMessageCountInWindow(
        startTime: Date,
        endTime: Date,
        filters?: {
            userId?: string;
            phoneNumber?: string;
            status?: SmsStatus[];
        }
    ): Promise<number>;

    /**
     * Get messages sent to a phone number in a time window
     */
    getMessagesToPhoneNumberInWindow(
        phoneNumber: string,
        startTime: Date,
        endTime: Date
    ): Promise<SmsMessage[]>;

    /**
     * Get messages sent by a user in a time window
     */
    getMessagesByUserInWindow(
        userId: string,
        startTime: Date,
        endTime: Date
    ): Promise<SmsMessage[]>;

    /**
     * Find messages by provider message ID (for webhook callbacks)
     */
    findByProviderMessageId(
        providerId: string,
        providerMessageId: string
    ): Promise<SmsMessage | null>;

    /**
     * Get statistics for a time period
     */
    getStatistics(
        startTime: Date,
        endTime: Date
    ): Promise<{
        total: number;
        queued: number;
        sending: number;
        sent: number;
        delivered: number;
        failed: number;
        cancelled: number;
        undelivered: number;
    }>;

    /**
     * Clean up old messages (for data retention)
     */
    deleteOlderThan(date: Date): Promise<number>;
}
