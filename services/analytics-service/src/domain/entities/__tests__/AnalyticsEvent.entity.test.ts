import { AnalyticsEvent, AnalyticsEventProperties } from '../AnalyticsEvent.entity';

const baseProps: AnalyticsEventProperties = {
    id: 'evt-1',
    type: 'order.created',
    data: { amount: 100 },
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    status: 'pending',
    metadata: { source: 'test' }
};

describe('AnalyticsEvent', () => {
    it('returns immutable event data and metadata', () => {
        const event = new AnalyticsEvent(baseProps);
        const copiedData = event.data;
        copiedData.amount = 999;

        const copiedMetadata = event.metadata!;
        copiedMetadata.source = 'mutated';

        expect(event.id).toBe('evt-1');
        expect(event.type).toBe('order.created');
        expect(event.status).toBe('pending');
        expect(event.data).toEqual({ amount: 100 });
        expect(event.metadata).toEqual({ source: 'test' });
    });

    it('marks events as processed idempotently', () => {
        const pending = new AnalyticsEvent(baseProps);
        const processed = pending.markAsProcessed();
        const processedAgain = processed.markAsProcessed();

        expect(processed.status).toBe('processed');
        expect(processed.processedAt).toBeInstanceOf(Date);
        expect(processedAgain).toBe(processed);
    });

    it('marks events as failed with reason', () => {
        const pending = new AnalyticsEvent(baseProps);
        const failed = pending.markAsFailed('network error');

        expect(failed.status).toBe('failed');
        expect(failed.metadata).toEqual({
            source: 'test',
            failureReason: 'network error'
        });
    });

    it('serializes to JSON', () => {
        const event = new AnalyticsEvent(baseProps);
        expect(event.toJSON()).toEqual({
            id: 'evt-1',
            type: 'order.created',
            data: { amount: 100 },
            timestamp: '2026-01-01T00:00:00.000Z',
            status: 'pending',
            processedAt: undefined,
            metadata: { source: 'test' }
        });
    });
});
