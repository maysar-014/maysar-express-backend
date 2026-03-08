import { PrismaClient } from '@prisma/client';

interface OutboxRecord {
    id: string;
    type: string;
}

interface OutboxDelegate {
    findMany(args: Record<string, unknown>): Promise<OutboxRecord[]>;
    update(args: Record<string, unknown>): Promise<unknown>;
}

export class OutboxProcessorJob {
    constructor(private readonly prisma: PrismaClient) { }

    public async run(): Promise<void> {
        const pendingEvents = await this.outboxDelegate.findMany({
            where: { published: false },
            take: 50
        });

        for (const event of pendingEvents) {
            try {
                console.log(`Publishing event ${event.id} of type ${event.type}`);
                // Publish to Kafka here

                await this.outboxDelegate.update({
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

    private get outboxDelegate(): OutboxDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.outbox ??
            client.training_Outbox) as OutboxDelegate | undefined;
        if (!delegate) {
            throw new Error('Outbox delegate is not configured on prisma client');
        }
        return delegate;
    }
}
