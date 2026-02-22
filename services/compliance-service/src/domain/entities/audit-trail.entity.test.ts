import { AuditTrail } from '../audit-trail.entity';

describe('AuditTrail Entity', () => {
  it('should create audit entry', () => {
    const audit = AuditTrail.create({
      id: 'a1',
      userId: 'u1',
      action: 'user.created',
      timestamp: new Date(),
      metadata: { ip: '127.0.0.1' }
    });
    expect(audit.getId()).toBe('a1');
    expect(audit.getAction()).toBe('user.created');
  });

  it('should include metadata', () => {
    const audit = AuditTrail.create({
      id: 'a1',
      userId: 'u1',
      action: 'login',
      timestamp: new Date(),
      metadata: { device: 'mobile' }
    });
    expect(audit.getMetadata()).toHaveProperty('device', 'mobile');
  });

  it('should validate timestamp', () => {
    expect(() => AuditTrail.create({
      id: 'a1',
      userId: 'u1',
      action: 'test',
      timestamp: new Date('invalid'),
      metadata: {}
    })).toThrow();
  });
});
