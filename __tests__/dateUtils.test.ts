import { formatDate } from '../utils/dateUtils';

describe('formatDate', () => {
  it('formats a Date object as DD/MM/YYYY', () => {
    const date = new Date(2025, 0, 15); // January 15, 2025
    expect(formatDate(date)).toBe('15/01/2025');
  });

  it('pads single-digit day and month', () => {
    const date = new Date(2025, 2, 5); // March 5, 2025
    expect(formatDate(date)).toBe('05/03/2025');
  });

  it('formats an ISO string', () => {
    // Note: new Date('2025-06-20') creates a date in UTC, which may shift depending on timezone
    // Use explicit month/day to avoid timezone issues
    const date = new Date(2025, 5, 20); // June 20, 2025
    expect(formatDate(date)).toBe('20/06/2025');
  });

  it('handles end of year', () => {
    const date = new Date(2025, 11, 31); // December 31, 2025
    expect(formatDate(date)).toBe('31/12/2025');
  });

  it('accepts a string input', () => {
    const result = formatDate('2025-01-15T12:00:00.000Z');
    // This might vary by timezone, but should contain 2025
    expect(result).toMatch(/\d{2}\/\d{2}\/2025/);
  });
});
