import { formatCurrency, formatTZS } from './currency.util';

describe('currency util', () => {
  it('formats Tanzanian shilling amounts using sw-TZ locale', () => {
    const amount = 12345.67;

    const formatted = formatTZS(amount);
    const expected = new Intl.NumberFormat('sw-TZ', {
      style: 'currency',
      currency: 'TZS'
    }).format(amount);

    expect(formatted).toBe(expected);
  });

  it('formats generic currency values for a given locale', () => {
    const amount = 1000;

    const formatted = formatCurrency(amount, 'USD', 'en-US');
    const expected = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

    expect(formatted).toBe(expected);
  });
});
