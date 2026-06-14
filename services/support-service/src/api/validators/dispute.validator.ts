import { z } from 'zod';
import { TicketPriority, TicketStatus } from '../../domain/types';

const optionalNumber = (min?: number, max?: number) =>
    z.preprocess((val) => {
        if (val === undefined || val === null) return undefined;
        const num = Number(val);
        return Number.isNaN(num) ? val : num;
    }, z.number().int().min(min ?? Number.NEGATIVE_INFINITY).max(max ?? Number.POSITIVE_INFINITY).optional());

const attachmentSchema = z.object({
    fileName: z.string().trim().min(1).max(255),
    fileUrl: z.string().url(),
    fileSize: z.number().int().positive(),
    mimeType: z.string().trim().min(1).max(255)
}).strict();

export const createDisputeSchema = z.object({
    orderId: z.string().trim().min(1).max(64),
    reason: z.string().trim().min(3).max(500),
    description: z.string().trim().min(10).max(5000),
    subject: z.string().trim().min(5).max(120).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    attachments: z.array(attachmentSchema).max(10).optional()
}).strict();

export const listDisputesSchema = z.object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(TicketPriority).optional(),
    userId: z.string().trim().min(1).optional(),
    page: optionalNumber(1),
    limit: optionalNumber(1, 100)
}).strict();

export const escalateDisputeSchema = z.object({
    reason: z.string().trim().min(3).max(500).optional(),
    priority: z.enum([TicketPriority.HIGH, TicketPriority.URGENT]).optional()
}).strict();

export const addDisputeEvidenceSchema = z.object({
    note: z.string().trim().min(1).max(2000).optional(),
    attachments: z.array(attachmentSchema).min(1).max(10).optional()
}).strict().refine(
    value => Boolean(value.note) || Boolean(value.attachments && value.attachments.length > 0),
    {
        message: 'At least one attachment or note is required',
        path: ['attachments']
    }
);
