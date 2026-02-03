import { PrismaClient } from '@prisma/client';

export class OutboxProcessorJob {
    constructor(private readonly prisma: PrismaClient) { }

    public async run(): Promise<void> {
        const pendingEvents = await this.prisma.outbox.findMany({
            where: { published: false },
            take: 50
        });

        for (const event of pendingEvents) {
            try {
                console.log(`Publishing event ${event.id} of type ${event.type}`);
                // Publish to Kafka here

                await this.prisma.outbox.update({
                    where: { id: event.id },
                    data: {
                        published: true,
                        publishedAt: new Date()
                    }
                });
            } catch (err) {
                console.error(`Failed to publish event ${event.id}:`, err);
            }
        }
    }
}
