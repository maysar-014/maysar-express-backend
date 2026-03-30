import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { PrismaClient } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';

type CampaignEventLike = {
    eventId?: string;
    eventType?: string;
    constructor?: {
        name?: string;
    };
    [key: string]: unknown;
};

@injectable()
export class EventPublisherService {
    constructor(
        @inject(TYPES.PrismaClient)
        private readonly prisma: PrismaClient
    ) { }

    async publish(event: unknown, tx?: PrismaClient): Promise<void> {
        const prisma = tx || this.prisma;
        const eventRecord = event as CampaignEventLike;

        await prisma.campaign_OutboxEvent.create({
            data: {
                id: makeId(getModelPrefix('Campaign_OutboxEvent')),
                eventId: eventRecord.eventId || makeId('evt'),
                eventType: eventRecord.eventType || eventRecord.constructor?.name || 'UnknownEvent',
                eventData: JSON.parse(JSON.stringify(event)),
                status: 'PENDING',
            },
        });
    }
}
