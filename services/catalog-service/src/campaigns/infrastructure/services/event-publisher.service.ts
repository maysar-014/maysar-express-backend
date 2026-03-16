import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { PrismaClient } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';

@injectable()
export class EventPublisherService {
    constructor(
        @inject(TYPES.PrismaClient)
        private readonly prisma: PrismaClient
    ) { }

    async publish(event: any, tx?: any): Promise<void> {
        const prisma = tx || this.prisma;

        await prisma.campaign_OutboxEvent.create({
            data: {
                id: makeId(getModelPrefix('Campaign_OutboxEvent')),
                eventId: event.eventId || makeId('evt'),
                eventType: event.eventType || event.constructor.name || 'UnknownEvent',
                eventData: JSON.parse(JSON.stringify(event)),
                status: 'PENDING',
            },
        });
    }
}
