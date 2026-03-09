jest.mock('@shared-events/eventBus', () => ({}), { virtual: true });

import { SupportEventPublisher } from './support-event-publisher';

describe('SupportEventPublisher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        if (!globalThis.crypto || !globalThis.crypto.randomUUID) {
            const crypto = require('crypto');
            (globalThis as any).crypto = crypto.webcrypto;
        }
        jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('publishes all support events with correct envelope eventType and payload', async () => {
        const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
        const publisher = new SupportEventPublisher(eventBus as any);

        await publisher.publishTicketCreated({ ticketId: 't1' } as any);
        await publisher.publishTicketAssigned({ ticketId: 't1', agentId: 'a1', assignedBy: 'SYSTEM' } as any);
        await publisher.publishTicketResolved({ ticketId: 't1', agentId: 'a1', resolutionTimeMinutes: 5, resolution: 'done' } as any);
        await publisher.publishTicketClosed({ ticketId: 't1', closedBy: 'a1' } as any);
        await publisher.publishMessageAdded({ ticketId: 't1', messageId: 'm1', senderId: 'u1', senderType: 'USER' } as any);

        expect(eventBus.publish).toHaveBeenCalledTimes(5);
        expect(eventBus.publish.mock.calls.map((call: any[]) => call[0].eventType)).toEqual([
            'TicketCreated',
            'TicketAssigned',
            'TicketResolved',
            'TicketClosed',
            'MessageAdded'
        ]);
        for (const [envelope] of eventBus.publish.mock.calls) {
            expect(envelope).toEqual(
                expect.objectContaining({
                    eventId: '11111111-1111-4111-8111-111111111111',
                    data: expect.any(Object),
                    timestamp: expect.any(Date)
                })
            );
        }
    });
});
