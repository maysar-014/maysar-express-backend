const loggerInfoMock = jest.fn();
const handleTicketCreatedMock = jest.fn();
const sagaConstructorMock = jest.fn().mockImplementation(() => ({
    handleTicketCreated: (...args: any[]) => handleTicketCreatedMock(...args)
}));

jest.mock('../services/logger.service', () => ({
    logger: {
        info: (...args: any[]) => loggerInfoMock(...args),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

jest.mock('../../application/sagas/ticket-lifecycle.saga', () => ({
    TicketLifecycleSaga: function () {
        return sagaConstructorMock();
    }
}));

import { SupportEventSubscriber } from './support-event-subscriber';

describe('SupportEventSubscriber', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('subscribes to expected events during initialization', async () => {
        const eventBus = { subscribe: jest.fn().mockResolvedValue(undefined) };
        const subscriber = new SupportEventSubscriber(eventBus as any);

        await subscriber.initialize();

        expect(eventBus.subscribe).toHaveBeenCalledTimes(2);
        expect(eventBus.subscribe).toHaveBeenNthCalledWith(1, 'TicketCreated', expect.any(Function));
        expect(eventBus.subscribe).toHaveBeenNthCalledWith(2, 'UserRegistered', expect.any(Function));
        expect(loggerInfoMock).toHaveBeenCalledWith('SupportEventSubscriber initialized');
    });

    it('handles TicketCreated by starting lifecycle saga with correlation id', async () => {
        const eventBus = { subscribe: jest.fn().mockResolvedValue(undefined) };
        const subscriber = new SupportEventSubscriber(eventBus as any);
        await subscriber.initialize();

        const createdHandler = eventBus.subscribe.mock.calls.find((call: any[]) => call[0] === 'TicketCreated')[1];
        await createdHandler({ data: { ticketId: 'ticket-5', userId: 'user-5' } });

        expect(sagaConstructorMock).toHaveBeenCalledTimes(1);
        expect(handleTicketCreatedMock).toHaveBeenCalledWith({ ticketId: 'ticket-5', userId: 'user-5' }, 'lifecycle-ticket-5');
        expect(loggerInfoMock).toHaveBeenCalledWith('Handling TicketCreated event for ticket-5');
    });

    it('logs UserRegistered handling with user id', async () => {
        const eventBus = { subscribe: jest.fn().mockResolvedValue(undefined) };
        const subscriber = new SupportEventSubscriber(eventBus as any);
        await subscriber.initialize();

        const userRegisteredHandler = eventBus.subscribe.mock.calls.find((call: any[]) => call[0] === 'UserRegistered')[1];
        await userRegisteredHandler({ data: { userId: 'user-77' } });

        expect(loggerInfoMock).toHaveBeenCalledWith('User registered: user-77. Ready to handle support for them.');
    });
});

