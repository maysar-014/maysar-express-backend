const containerGetMock = jest.fn();
const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();

jest.mock('../../infrastructure/container', () => ({
    container: {
        get: (...args: any[]) => containerGetMock(...args)
    }
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
    logger: {
        info: (...args: any[]) => loggerInfoMock(...args),
        warn: (...args: any[]) => loggerWarnMock(...args),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

import { TicketStatus } from '../../domain/types';
import { TicketEscalationJob } from './ticket-escalation.saga';

describe('TicketEscalationJob', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('escalates matching tickets and persists updates', async () => {
        const escalatedTicket: any = { id: 'ticket-1', priority: 'MEDIUM' };
        const stableTicket: any = { id: 'ticket-2', priority: 'LOW' };
        const ticketRepository = {
            findByStatuses: jest.fn().mockResolvedValue([escalatedTicket, stableTicket]),
            update: jest.fn().mockResolvedValue(undefined)
        };
        const policy = {
            shouldEscalate: jest.fn((ticket: any) => ticket.id === 'ticket-1'),
            getEscalationReason: jest.fn().mockReturnValue('No update on ticket within the required SLA'),
            getEscalationPriority: jest.fn().mockReturnValue('HIGH')
        };
        containerGetMock
            .mockReturnValueOnce(policy)
            .mockReturnValueOnce(ticketRepository);

        const job = new TicketEscalationJob();
        await job.monitorTickets();

        expect(ticketRepository.findByStatuses).toHaveBeenCalledWith([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]);
        expect(policy.shouldEscalate).toHaveBeenCalledTimes(2);
        expect(escalatedTicket.priority).toBe('HIGH');
        expect(ticketRepository.update).toHaveBeenCalledWith(escalatedTicket);
        expect(ticketRepository.update).toHaveBeenCalledTimes(1);
        expect(loggerWarnMock).toHaveBeenCalledWith(
            'Escalating ticket ticket-1',
            expect.objectContaining({ reason: 'No update on ticket within the required SLA' })
        );
    });

    it('does not update tickets when no escalation criteria match', async () => {
        const ticketRepository = {
            findByStatuses: jest.fn().mockResolvedValue([{ id: 'ticket-3', priority: 'LOW' }]),
            update: jest.fn().mockResolvedValue(undefined)
        };
        const policy = {
            shouldEscalate: jest.fn().mockReturnValue(false),
            getEscalationReason: jest.fn(),
            getEscalationPriority: jest.fn()
        };
        containerGetMock
            .mockReturnValueOnce(policy)
            .mockReturnValueOnce(ticketRepository);

        const job = new TicketEscalationJob();
        await job.monitorTickets();

        expect(ticketRepository.update).not.toHaveBeenCalled();
        expect(loggerInfoMock).toHaveBeenCalledWith('Running ticket escalation monitor');
    });
});

