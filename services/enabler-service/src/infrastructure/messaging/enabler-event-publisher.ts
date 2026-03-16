import prisma from '../database/prisma-client';
import { getModelPrefix, makeId } from '@shared/ids/id';

export class EnablerEventPublisher {

    async publish(event: any): Promise<void> {
        const eventName = event.constructor.name;
        const eventData = JSON.stringify(event);

        // Save to transactional outbox
        await prisma.enabler_OutboxEvent.create({
            data: {
                id: makeId(getModelPrefix('Enabler_OutboxEvent')),
                eventId: event.eventId || makeId('evt'),
                eventType: eventName,
                eventData: eventData, // Stores as JSON
                status: 'PENDING',
                createdAt: new Date()
            }
        });

        console.log(`[EnablerService] Published event ${eventName} to outbox`);
    }
}
