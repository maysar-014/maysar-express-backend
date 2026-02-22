import { TicketMapper } from '../ticket.mapper';

describe('TicketMapper', () => {
    it('should map to DTO', () => {
        const entity = { id: 't1', subject: 'Issue', status: 'open', getSubject: () => 'Issue', getStatus: () => 'open' };
        const dto = TicketMapper.toDTO(entity as any);
        expect(dto.id).toBe('t1');
    });

    it('should map list to DTOs', () => {
        const entities = [{ id: 't1', getSubject: () => 'Issue', getStatus: () => 'open' }];
        const dtos = TicketMapper.toDTOList(entities as any);
        expect(dtos).toHaveLength(1);
    });
});
