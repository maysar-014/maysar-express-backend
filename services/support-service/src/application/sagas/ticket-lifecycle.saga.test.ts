const startMock = jest.fn();
const containerGetMock = jest.fn();
const loggerInfoMock = jest.fn();

jest.mock('@shared/saga/saga.orchestrator', () => ({
    DistributedSagaOrchestrator: class {
        constructor(..._args: any[]) { }
        public async start(...args: any[]) {
            return startMock(...args);
        }
    }
}));

jest.mock('../../infrastructure/repositories/saga.repository', () => ({
    sagaLogRepository: {}
}));

jest.mock('../../infrastructure/container', () => ({
    container: {
        get: (...args: any[]) => containerGetMock(...args)
    }
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
    logger: {
        info: (...args: any[]) => loggerInfoMock(...args),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

import { TicketCreatedEvent, TicketAssignedEvent, TicketResolvedEvent } from '../../domain/events/ticket-events';
import { TicketPriority } from '../../domain/types';
import { TicketLifecycleSaga } from './ticket-lifecycle.saga';

describe('TicketLifecycleSaga', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('starts saga with constructed context when handling TicketCreated', async () => {
        const saga = new TicketLifecycleSaga();
        const event = new TicketCreatedEvent('ticket-1', 'user-1', 'Issue', TicketPriority.HIGH, 'PAYMENT');

        await saga.handleTicketCreated(event, 'corr-1');

        expect(startMock).toHaveBeenCalledWith(
            expect.objectContaining({
                ticketId: 'ticket-1',
                notifiedAgents: false,
                metadata: { correlationId: 'corr-1' }
            }),
            'corr-1'
        );
    });

    it('auto-assign step stores agent id and notify step compensates', async () => {
        const autoAssign = { execute: jest.fn().mockResolvedValue({ assignedAgentId: 'agent-9' }) };
        containerGetMock.mockReturnValue(autoAssign);
        const saga = new TicketLifecycleSaga() as any;
        const ctx: any = { ticketId: 'ticket-2', notifiedAgents: false };

        const steps = saga.defineSteps();
        await steps[0].execute(ctx, 'saga-1');
        expect(ctx.autoAssignedId).toBe('agent-9');
        expect(loggerInfoMock).toHaveBeenCalledWith('Ticket ticket-2 auto-assigned to agent-9');

        const notifyCtx: any = { ticketId: 'ticket-3', notifiedAgents: false };
        await steps[1].execute(notifyCtx, 'saga-2');
        expect(notifyCtx.notifiedAgents).toBe(true);
        await steps[1].compensate(notifyCtx, 'saga-2');
        expect(notifyCtx.notifiedAgents).toBe(false);
    });

    it('logs assignment and resolution handling', async () => {
        const saga = new TicketLifecycleSaga();

        await saga.handleTicketAssigned(new TicketAssignedEvent('ticket-4', 'agent-1', 'SYSTEM'));
        await saga.handleTicketResolved(new TicketResolvedEvent('ticket-4', 'agent-1', 42, 'done'));

        expect(loggerInfoMock).toHaveBeenCalledWith('Ticket ticket-4 assigned to agent-1');
        expect(loggerInfoMock).toHaveBeenCalledWith('Ticket ticket-4 resolved by agent-1');
    });
});
