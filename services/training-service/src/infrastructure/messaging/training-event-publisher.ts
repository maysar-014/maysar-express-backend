import { PrismaClient } from '@prisma/client';

export class TrainingEventPublisher {
    constructor(private readonly prisma: PrismaClient) { }

    public async publish(type: string, payload: any): Promise<void> {
        await this.prisma.outbox.create({
            data: {
                type,
                payload,
                published: false
            }
        });
    }
}
