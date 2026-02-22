import { AuditInfo, ActorType } from '../audit-info.value-object';

describe('AuditInfo Value Object', () => {
    const validProps = {
        actor: 'user-123',
        actorType: ActorType.USER,
        action: 'CREATE_WALLET',
        reason: 'New user registration'
    };

    describe('Creation', () => {
        it('should create a valid AuditInfo with timestamp', () => {
            const auditInfo = AuditInfo.create(validProps);

            expect(auditInfo.actor).toBe(validProps.actor);
            expect(auditInfo.actorType).toBe(validProps.actorType);
            expect(auditInfo.action).toBe(validProps.action);
            expect(auditInfo.reason).toBe(validProps.reason);
            expect(auditInfo.timestamp).toBeInstanceOf(Date);
            // Verify timestamp is recent (within last second)
            expect(Date.now() - auditInfo.timestamp.getTime()).toBeLessThan(1000);
        });

        it('should create with optional fields', () => {
            const props = {
                ...validProps,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                metadata: { key: 'value' }
            };

            const auditInfo = AuditInfo.create(props);

            expect(auditInfo.ipAddress).toBe(props.ipAddress);
            expect(auditInfo.userAgent).toBe(props.userAgent);
            expect(auditInfo.metadata).toEqual(props.metadata);
        });

        it('should allow constructing with existing timestamp', () => {
            const timestamp = new Date('2023-01-01');
            const auditInfo = new AuditInfo({
                ...validProps,
                timestamp
            });

            expect(auditInfo.timestamp).toBe(timestamp);
        });
    });
});
