import prisma from '../database/prisma-client';
import { v4 as uuidv4 } from 'uuid';

export class EnablerEventPublisher {

    async publish(event: any): Promise<void> {
        const eventName = event.constructor.name;
        const eventData = JSON.stringify(event);

        // Save to transactional outbox
        await prisma.enabler_OutboxEvent.create({
            data: {
                eventId: uuidv4(),
                eventType: eventName,
                eventData: eventData, // Stores as JSON
                status: 'PENDING',
                createdAt: new Date()
            }
        });

        console.log(`[EnablerService] Published event ${eventName} to outbox`);
    }
}
