import { Session } from '../session.entity';

describe('Session Entity', () => {
  it('should create valid session', () => {
    const session = Session.create({
      id: 's1',
      userId: 'u1',
      token: 'token123',
      expiresAt: new Date(Date.now() + 3600000)
    });
    expect(session.getId()).toBe('s1');
    expect(session.isExpired()).toBe(false);
  });

  it('should detect expired session', () => {
    const session = Session.create({
      id: 's1',
      userId: 'u1',
      token: 'token123',
      expiresAt: new Date(Date.now() - 1000)
    });
    expect(session.isExpired()).toBe(true);
  });

  it('should refresh session', () => {
    const session = Session.create({
      id: 's1',
      userId: 'u1',
      token: 'token123',
      expiresAt: new Date(Date.now() + 1000)
    });
    session.refresh(3600000);
    expect(session.isExpired()).toBe(false);
  });
});
