import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

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
                id: uuidv4(),
                eventId: uuidv4(),
                eventType: event.eventType || event.constructor.name || 'UnknownEvent',
                eventData: JSON.parse(JSON.stringify(event)),
                status: 'PENDING',
            },
        });
    }
}
