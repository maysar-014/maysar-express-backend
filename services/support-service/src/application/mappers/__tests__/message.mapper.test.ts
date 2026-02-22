import { MessageMapper } from '../message.mapper';

describe('MessageMapper', () => {
    it('should map to DTO', () => {
        const entity = { id: 'm1', content: 'Hello', getContent: () => 'Hello' };
        const dto = MessageMapper.toDTO(entity as any);
        expect(dto.id).toBe('m1');
    });
});
