import { SenderType } from '../../domain/types';

export interface AddMessageDto {
    ticketId: string;
    senderId: string;
    senderType: SenderType;
    content: string;
    isInternal?: boolean;
    attachments?: string[]; // IDs of uploaded attachments
}

export interface MessageResponseDto {
    id: string;
    ticketId: string;
    senderId: string;
    senderType: SenderType;
    content: string;
    isInternal: boolean;
    createdAt: Date;
}

export interface MessageListDto {
    items: MessageResponseDto[];
    total: number;
}
