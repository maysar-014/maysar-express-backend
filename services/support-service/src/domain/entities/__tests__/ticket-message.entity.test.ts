import { TicketMessage } from '../ticket-message.entity';
import { SenderType } from '../../types';

describe('TicketMessage Entity', () => {
    const createMessage = (type: SenderType = SenderType.USER) => TicketMessage.create({
        id: 'msg-1',
        ticketId: 't-1',
        senderId: 'u-1',
        senderType: type,
        content: 'Help me',
        isInternal: false
    });

    it('should create message', () => {
        const msg = createMessage();
        expect(msg.content).toBe('Help me');
        expect(msg.createdAt).toBeDefined();
    });

    it('should identify sender', () => {
        const userMsg = createMessage(SenderType.USER);
        expect(userMsg.isFromUser()).toBe(true);
        expect(userMsg.isFromAgent()).toBe(false);

        const agentMsg = createMessage(SenderType.AGENT);
        expect(agentMsg.isFromAgent()).toBe(true);
    });

    it('should validate content', () => {
        const msg = TicketMessage.create({
            id: '1',
            ticketId: 't',
            senderId: 'u',
            senderType: SenderType.USER,
            content: ''
        });
        const result = msg.validate();
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Message content cannot be empty');
    });
});
