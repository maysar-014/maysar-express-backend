import { TicketSubject } from './ticket-subject.value-object';

describe('TicketSubject', () => {
  it('trims and stores valid ticket subject', () => {
    const subject = TicketSubject.create('   Need help with payout delay   ');
    expect(subject.getValue()).toBe('Need help with payout delay');
  });

  it('enforces length and special character constraints', () => {
    expect(() => TicketSubject.create('abcd')).toThrow('Ticket subject must be between 5 and 200 characters');
    expect(() => TicketSubject.create('!@#$%')).toThrow('Ticket subject contains too many special characters');
    expect(() => TicketSubject.create('x'.repeat(201))).toThrow('Ticket subject must be between 5 and 200 characters');
  });

  it('supports equality checks', () => {
    const a = TicketSubject.create('Payment reversed incorrectly');
    const b = TicketSubject.create('Payment reversed incorrectly');
    const c = TicketSubject.create('Order not delivered');

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
