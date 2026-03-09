import { TicketCategory, TicketCategoryType } from './ticket-category.value-object';

describe('TicketCategory', () => {
  it('normalizes category to uppercase and exposes specialization', () => {
    const category = TicketCategory.create('payment');

    expect(category.getValue()).toBe(TicketCategoryType.PAYMENT);
    expect(category.getSpecialization()).toBe('PAYMENT');
  });

  it('validates allowed categories', () => {
    expect(() => TicketCategory.create('unknown')).toThrow('Invalid ticket category');
    expect(() => TicketCategory.create('ORDER')).not.toThrow();
  });

  it('supports equality checks', () => {
    const a = TicketCategory.create('general');
    const b = TicketCategory.create('GENERAL');
    const c = TicketCategory.create('technical');

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
