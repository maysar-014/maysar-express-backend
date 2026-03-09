import { AnalyticsEventRepository } from '../AnalyticsEventRepository';
import { AnalyticsEvent } from '../../../domain/entities/AnalyticsEvent.entity';

function event(id: string, status: 'pending' | 'processed' | 'failed'): AnalyticsEvent {
    return new AnalyticsEvent({
        id,
        type: 'order.created',
        data: { id: `order-${id}` },
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        status
    });
}

describe('AnalyticsEventRepository', () => {
    let repository: AnalyticsEventRepository;

    beforeEach(() => {
        repository = new AnalyticsEventRepository();
    });

    it('saves and loads events by id', async () => {
        const e = event('evt-1', 'pending');
        await repository.save(e);

        const loaded = await repository.findById('evt-1');
        expect(loaded?.id).toBe('evt-1');
        expect(loaded?.status).toBe('pending');
    });

    it('filters pending events and marks events as processed', async () => {
        await repository.save(event('evt-pending', 'pending'));
        await repository.save(event('evt-failed', 'failed'));

        const pendingBefore = await repository.findPending();
        expect(pendingBefore.map(item => item.id)).toEqual(['evt-pending']);

        await repository.markProcessed('evt-pending');
        const updated = await repository.findById('evt-pending');
        expect(updated?.status).toBe('processed');

        const pendingAfter = await repository.findPending();
        expect(pendingAfter).toHaveLength(0);
    });

    it('is a no-op when marking unknown ids as processed', async () => {
        await expect(repository.markProcessed('missing')).resolves.toBeUndefined();
    });
});
