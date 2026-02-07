import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { ITicketAttachmentRepository } from '../../domain/repositories/interfaces';
import { logger } from '../services/logger.service';

@injectable()
export class PrismaTicketAttachmentRepository implements ITicketAttachmentRepository {
    constructor(
        @inject(TYPES.PrismaClient) private prisma: PrismaClient
    ) { }

    public async create(attachment: any, ticketId: string, messageId?: string): Promise<any> {
        try {
            return await this.prisma.support_TicketAttachment.create({
                data: {
                    id: attachment.id,
                    ticketId: ticketId,
                    messageId: messageId,
                    fileName: attachment.fileName,
                    fileUrl: attachment.fileUrl,
                    fileSize: attachment.fileSize,
                    mimeType: attachment.mimeType,
                    uploadedBy: attachment.uploadedBy || 'SYSTEM'
                }
            });
        } catch (error) {
            logger.error(`Error creating ticket attachment: ${attachment.id}`, { error });
            throw error;
        }
    }

    public async update(id: string, data: any): Promise<any> {
        try {
            return await this.prisma.support_TicketAttachment.update({
                where: { id },
                data
            });
        } catch (error) {
            logger.error(`Error updating ticket attachment: ${id}`, { error });
            throw error;
        }
    }

    public async findByTicketId(ticketId: string): Promise<any[]> {
        try {
            return await this.prisma.support_TicketAttachment.findMany({
                where: { ticketId }
            });
        } catch (error) {
            logger.error(`Error finding attachments for ticket: ${ticketId}`, { error });
            throw error;
        }
    }

    public async findByMessageId(messageId: string): Promise<any[]> {
        try {
            return await this.prisma.support_TicketAttachment.findMany({
                where: { messageId }
            });
        } catch (error) {
            logger.error(`Error finding attachments for message: ${messageId}`, { error });
            throw error;
        }
    }
}
