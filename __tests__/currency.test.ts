import { formatCurrency, formatCurrencyShort } from '../utils/currency';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0');
    expect(formatCurrency(0)).toContain('KM');
  });

  it('formats with two decimal places', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('KM');
    // Should have decimals (locale-dependent format)
    expect(result).toMatch(/1[.,]?500[.,]00\s*KM/);
  });

  it('formats large numbers', () => {
    const result = formatCurrency(25000.5);
    expect(result).toContain('KM');
  });
});

describe('formatCurrencyShort', () => {
  it('formats without forced decimal places', () => {
    const result = formatCurrencyShort(1500);
    expect(result).toContain('KM');
    expect(result).toContain('1');
  });

  it('includes KM suffix', () => {
    expect(formatCurrencyShort(0)).toContain('KM');
  });
});
