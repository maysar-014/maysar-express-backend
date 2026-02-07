import { Entity } from '../interfaces';
import { SenderType } from '../types';

export class TicketMessage implements Entity {
    public readonly id: string;
    public readonly ticketId: string;
    public readonly senderId: string;
    public readonly senderType: SenderType;
    public readonly content: string;
    public readonly isInternal: boolean;
    public readonly createdAt: Date;

    constructor(props: {
        id: string;
        ticketId: string;
        senderId: string;
        senderType: SenderType;
        content: string;
        isInternal: boolean;
        createdAt: Date;
    }) {
        this.id = props.id;
        this.ticketId = props.ticketId;
        this.senderId = props.senderId;
        this.senderType = props.senderType;
        this.content = props.content;
        this.isInternal = props.isInternal;
        this.createdAt = props.createdAt;
    }

    public static create(props: {
        id: string;
        ticketId: string;
        senderId: string;
        senderType: SenderType;
        content: string;
        isInternal?: boolean;
    }): TicketMessage {
        return new TicketMessage({
            ...props,
            isInternal: props.isInternal ?? false,
            createdAt: new Date()
        });
    }

    public isFromUser(): boolean {
        return this.senderType === SenderType.USER;
    }

    public isFromAgent(): boolean {
        return this.senderType === SenderType.AGENT;
    }

    public validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (!this.content || this.content.trim().length === 0) {
            errors.push('Message content cannot be empty');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
