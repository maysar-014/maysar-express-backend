import { PhoneNumber } from '../value-objects/phone-number.value-object';
import { MessageContent } from '../value-objects/message-content.value-object';
import { ProviderResponse } from '../value-objects/provider-response.value-object';
import { InvalidStateTransitionError } from '../errors/sms.errors';
import {
    SmsQueued,
    SmsSending,
    SmsSent,
    SmsDelivered,
    SmsFailed,
    SmsCancelled,
    SmsUndelivered,
    DomainEvent
} from '../events/sms.events';

/**
 * SMS Message Status
 * Represents the lifecycle states of an SMS message
 */
export enum SmsStatus {
    QUEUED = 'QUEUED',
    SENDING = 'SENDING',
    SENT = 'SENT',
    DELIVERED = 'DELIVERED',
    UNDELIVERED = 'UNDELIVERED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

/**
 * SMS Message Entity
 * Core domain entity representing an SMS message
 */
export class SmsMessage {
    private readonly id: string;
    private readonly phoneNumber: PhoneNumber;
    private readonly content: MessageContent;
    private status: SmsStatus;
    private providerId?: string;
    private providerMessageId?: string;
    private readonly userId?: string;
    private retryCount: number;
    private readonly maxRetries: number;
    private readonly scheduledAt?: Date;
    private sentAt?: Date;
    private deliveredAt?: Date;
    private failedAt?: Date;
    private lastError?: string;
    private readonly metadata?: Record<string, any>;
    private readonly createdAt: Date;
    private updatedAt: Date;
    private domainEvents: DomainEvent[] = [];

    private constructor(props: {
        id: string;
        phoneNumber: PhoneNumber;
        content: MessageContent;
        status: SmsStatus;
        providerId?: string;
        providerMessageId?: string;
        userId?: string;
        retryCount: number;
        maxRetries: number;
        scheduledAt?: Date;
        sentAt?: Date;
        deliveredAt?: Date;
        failedAt?: Date;
        lastError?: string;
        metadata?: Record<string, any>;
        createdAt: Date;
        updatedAt: Date;
    }) {
        this.id = props.id;
        this.phoneNumber = props.phoneNumber;
        this.content = props.content;
        this.status = props.status;
        this.providerId = props.providerId;
        this.providerMessageId = props.providerMessageId;
        this.userId = props.userId;
        this.retryCount = props.retryCount;
        this.maxRetries = props.maxRetries;
        this.scheduledAt = props.scheduledAt;
        this.sentAt = props.sentAt;
        this.deliveredAt = props.deliveredAt;
        this.failedAt = props.failedAt;
        this.lastError = props.lastError;
        this.metadata = props.metadata;
        this.createdAt = props.createdAt;
        this.updatedAt = props.updatedAt;
    }

    /**
     * Factory method to create a new SMS message
     */
    static create(props: {
        id: string;
        phoneNumber: string;
        content: string;
        userId?: string;
        maxRetries?: number;
        scheduledAt?: Date;
        metadata?: Record<string, any>;
    }): SmsMessage {
        const phoneNumber = PhoneNumber.create(props.phoneNumber);
        const content = MessageContent.create(props.content);
        const now = new Date();

        const message = new SmsMessage({
            id: props.id,
            phoneNumber,
            content,
            status: SmsStatus.QUEUED,
            userId: props.userId,
            retryCount: 0,
            maxRetries: props.maxRetries ?? 3,
            scheduledAt: props.scheduledAt,
            metadata: props.metadata,
            createdAt: now,
            updatedAt: now
        });

        // Add domain event
        message.addDomainEvent(
            new SmsQueued(
                props.id,
                phoneNumber.getValue(),
                content.getSegmentCount(),
                props.userId
            )
        );

        return message;
    }

    /**
     * Reconstitute from persistence
     */
    static reconstitute(props: {
        id: string;
        phoneNumber: string;
        content: string;
        status: SmsStatus;
        providerId?: string;
        providerMessageId?: string;
        userId?: string;
        retryCount: number;
        maxRetries: number;
        scheduledAt?: Date;
        sentAt?: Date;
        deliveredAt?: Date;
        failedAt?: Date;
        lastError?: string;
        metadata?: Record<string, any>;
        createdAt: Date;
        updatedAt: Date;
    }): SmsMessage {
        const phoneNumber = PhoneNumber.create(props.phoneNumber);
        const content = MessageContent.create(props.content);

        return new SmsMessage({
            ...props,
            phoneNumber,
            content
        });
    }

    // ==================== State Transitions ====================

    markAsSending(providerId: string): void {
        this.validateTransition(SmsStatus.SENDING);

        this.status = SmsStatus.SENDING;
        this.providerId = providerId;
        this.updatedAt = new Date();

        this.addDomainEvent(
            new SmsSending(this.id, this.phoneNumber.getValue(), providerId)
        );
    }

    markAsSent(providerResponse: ProviderResponse): void {
        this.validateTransition(SmsStatus.SENT);

        this.status = SmsStatus.SENT;
        this.providerMessageId = providerResponse.getProviderMessageId();
        this.sentAt = new Date();
        this.updatedAt = new Date();

        this.addDomainEvent(
            new SmsSent(
                this.id,
                this.phoneNumber.getValue(),
                this.providerId!,
                this.providerMessageId
            )
        );
    }

    markAsDelivered(): void {
        this.validateTransition(SmsStatus.DELIVERED);

        this.status = SmsStatus.DELIVERED;
        this.deliveredAt = new Date();
        this.updatedAt = new Date();

        this.addDomainEvent(
            new SmsDelivered(
                this.id,
                this.phoneNumber.getValue(),
                this.providerId!,
                this.providerMessageId!
            )
        );
    }

    markAsUndelivered(reason?: string): void {
        this.validateTransition(SmsStatus.UNDELIVERED);

        this.status = SmsStatus.UNDELIVERED;
        this.lastError = reason;
        this.updatedAt = new Date();

        this.addDomainEvent(
            new SmsUndelivered(
                this.id,
                this.phoneNumber.getValue(),
                this.providerId!,
                this.providerMessageId!,
                reason
            )
        );
    }

    markAsFailed(error: string): void {
        this.validateTransition(SmsStatus.FAILED);

        this.status = SmsStatus.FAILED;
        this.lastError = error;
        this.failedAt = new Date();
        this.updatedAt = new Date();

        this.addDomainEvent(
            new SmsFailed(
                this.id,
                this.phoneNumber.getValue(),
                error,
                this.retryCount,
                this.canRetry(),
                this.providerId
            )
        );
    }

    markAsCancelled(reason: string): void {
        this.validateTransition(SmsStatus.CANCELLED);

        this.status = SmsStatus.CANCELLED;
        this.lastError = reason;
        this.updatedAt = new Date();

        this.addDomainEvent(
            new SmsCancelled(this.id, this.phoneNumber.getValue(), reason, this.retryCount)
        );
    }

    // ==================== Retry Logic ====================

    canRetry(): boolean {
        return this.status === SmsStatus.FAILED && this.retryCount < this.maxRetries;
    }

    incrementRetryCount(): void {
        if (!this.canRetry()) {
            throw new Error('Cannot retry: max retries exceeded or message not in FAILED state');
        }

        this.retryCount++;
        this.status = SmsStatus.QUEUED;
        this.lastError = undefined;
        this.updatedAt = new Date();
    }

    // ==================== Validation ====================

    private validateTransition(newStatus: SmsStatus): void {
        const validTransitions: Record<SmsStatus, SmsStatus[]> = {
            [SmsStatus.QUEUED]: [SmsStatus.SENDING, SmsStatus.CANCELLED],
            [SmsStatus.SENDING]: [SmsStatus.SENT, SmsStatus.FAILED],
            [SmsStatus.SENT]: [SmsStatus.DELIVERED, SmsStatus.UNDELIVERED],
            [SmsStatus.DELIVERED]: [],
            [SmsStatus.UNDELIVERED]: [],
            [SmsStatus.FAILED]: [SmsStatus.QUEUED, SmsStatus.CANCELLED],
            [SmsStatus.CANCELLED]: []
        };

        const allowedTransitions = validTransitions[this.status];
        if (!allowedTransitions.includes(newStatus)) {
            throw new InvalidStateTransitionError(
                this.status,
                newStatus,
                'Invalid state transition for SMS message'
            );
        }
    }

    // ==================== Domain Events ====================

    private addDomainEvent(event: DomainEvent): void {
        this.domainEvents.push(event);
    }

    getDomainEvents(): DomainEvent[] {
        return [...this.domainEvents];
    }

    clearDomainEvents(): void {
        this.domainEvents = [];
    }

    // ==================== Getters ====================

    getId(): string {
        return this.id;
    }

    getPhoneNumber(): PhoneNumber {
        return this.phoneNumber;
    }

    getContent(): MessageContent {
        return this.content;
    }

    getStatus(): SmsStatus {
        return this.status;
    }

    getProviderId(): string | undefined {
        return this.providerId;
    }

    getProviderMessageId(): string | undefined {
        return this.providerMessageId;
    }

    getUserId(): string | undefined {
        return this.userId;
    }

    getRetryCount(): number {
        return this.retryCount;
    }

    getMaxRetries(): number {
        return this.maxRetries;
    }

    getScheduledAt(): Date | undefined {
        return this.scheduledAt;
    }

    getSentAt(): Date | undefined {
        return this.sentAt;
    }

    getDeliveredAt(): Date | undefined {
        return this.deliveredAt;
    }

    getFailedAt(): Date | undefined {
        return this.failedAt;
    }

    getLastError(): string | undefined {
        return this.lastError;
    }

    getMetadata(): Record<string, any> | undefined {
        return this.metadata;
    }

    getCreatedAt(): Date {
        return this.createdAt;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    // ==================== Utility Methods ====================

    isQueued(): boolean {
        return this.status === SmsStatus.QUEUED;
    }

    isSending(): boolean {
        return this.status === SmsStatus.SENDING;
    }

    isSent(): boolean {
        return this.status === SmsStatus.SENT;
    }

    isDelivered(): boolean {
        return this.status === SmsStatus.DELIVERED;
    }

    isFailed(): boolean {
        return this.status === SmsStatus.FAILED;
    }

    isCancelled(): boolean {
        return this.status === SmsStatus.CANCELLED;
    }

    isTerminal(): boolean {
        return [
            SmsStatus.DELIVERED,
            SmsStatus.UNDELIVERED,
            SmsStatus.CANCELLED
        ].includes(this.status);
    }
}
