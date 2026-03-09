import { TicketPriority as TicketPriorityEnum } from '../types';
import { TicketPriority } from './ticket-priority.value-object';

describe('TicketPriority', () => {
  it('creates and evaluates urgency', () => {
    const low = TicketPriority.create(TicketPriorityEnum.LOW);
    const high = TicketPriority.create(TicketPriorityEnum.HIGH);

    expect(low.getValue()).toBe('LOW');
    expect(low.isUrgent()).toBe(false);
    expect(high.isUrgent()).toBe(true);
  });

  it('escalates through priority chain and stops at urgent', () => {
    const low = TicketPriority.create(TicketPriorityEnum.LOW);
    const medium = low.escalate();
    const high = medium.escalate();
    const urgent = high.escalate();

    expect(medium.getValue()).toBe('MEDIUM');
    expect(high.getValue()).toBe('HIGH');
    expect(urgent.getValue()).toBe('URGENT');
    expect(urgent.escalate()).toBe(urgent);
  });

  it('supports value-object equality', () => {
    const a = TicketPriority.create(TicketPriorityEnum.MEDIUM);
    const b = TicketPriority.create(TicketPriorityEnum.MEDIUM);
    const c = TicketPriority.create(TicketPriorityEnum.HIGH);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
