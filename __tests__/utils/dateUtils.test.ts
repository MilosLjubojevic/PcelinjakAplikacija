/**
 * LEARNING TESTS: Date Utility Functions
 *
 * This file teaches you about testing functions with different input types.
 *
 * NEW CONCEPTS:
 * - Testing the same function with different input types
 * - Edge cases (what could go wrong?)
 * - Using .toMatch() for pattern matching
 */

import { formatDate } from '../../utils/dateUtils';

describe('formatDate', () => {
  // Testing with a Date object input
  describe('when given a Date object', () => {
    it('formats a date to DD/MM/YYYY format', () => {
      // Create a specific date: January 15, 2024
      const date = new Date(2024, 0, 15); // Month is 0-indexed!

      const result = formatDate(date);

      expect(result).toBe('15/01/2024');
    });

    it('pads single-digit days with zero', () => {
      const date = new Date(2024, 5, 5); // June 5, 2024

      const result = formatDate(date);

      expect(result).toBe('05/06/2024');
    });

    it('pads single-digit months with zero', () => {
      const date = new Date(2024, 2, 25); // March 25, 2024

      const result = formatDate(date);

      expect(result).toBe('25/03/2024');
    });

    it('handles December correctly (month 12)', () => {
      const date = new Date(2024, 11, 31); // December 31, 2024

      const result = formatDate(date);

      expect(result).toBe('31/12/2024');
    });
  });

  // Testing with a string input
  describe('when given a string', () => {
    it('parses and formats an ISO date string', () => {
      const dateString = '2024-03-20';

      const result = formatDate(dateString);

      // Note: This might show as 19/03/2024 or 20/03/2024 depending on timezone
      // We use toMatch to be more flexible
      expect(result).toMatch(/^\d{2}\/03\/2024$/);
    });

    it('handles full ISO datetime string', () => {
      const dateString = '2024-06-15T10:30:00';

      const result = formatDate(dateString);

      expect(result).toBe('15/06/2024');
    });
  });

  // Edge cases - what happens in unusual situations?
  describe('edge cases', () => {
    it('handles the first day of the year', () => {
      const date = new Date(2024, 0, 1);

      const result = formatDate(date);

      expect(result).toBe('01/01/2024');
    });

    it('handles leap year February 29', () => {
      const date = new Date(2024, 1, 29); // 2024 is a leap year

      const result = formatDate(date);

      expect(result).toBe('29/02/2024');
    });
  });
});

/**
 * MORE MATCHERS TO LEARN:
 *
 * expect(value).toBe(x)              - Exact equality (===)
 * expect(value).toEqual(x)           - Deep equality for objects/arrays
 * expect(value).toMatch(/regex/)     - Regex matching for strings
 * expect(value).toContain(x)         - Array/string contains
 * expect(value).toBeTruthy()         - Truthy value
 * expect(value).toBeFalsy()          - Falsy value
 * expect(value).toBeNull()           - Specifically null
 * expect(value).toBeUndefined()      - Specifically undefined
 * expect(value).toBeGreaterThan(x)   - Number comparison
 * expect(value).toBeLessThan(x)      - Number comparison
 *
 * EXERCISES:
 * 1. What happens if you pass an invalid date string like "not-a-date"?
 * 2. Add a test for dates in the far past (year 1900) and far future (year 3000)
 * 3. Test what happens with different timezone strings
 */
