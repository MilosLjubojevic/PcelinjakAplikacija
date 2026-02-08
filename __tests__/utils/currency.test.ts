/**
 * LEARNING TESTS: Currency Utility Functions
 *
 * This file teaches you the basics of unit testing with Jest.
 *
 * KEY CONCEPTS:
 * - describe(): Groups related tests together
 * - it() or test(): Defines a single test case
 * - expect(): Makes assertions about the result
 * - toBe(): Checks strict equality (===)
 *
 * RUN THIS TEST:
 * npm test -- currency.test.ts
 */

import { formatCurrency, formatCurrencyShort } from '../../utils/currency';

// describe() groups related tests - like a chapter in a book
describe('formatCurrency', () => {

  // it() defines a single test - what behavior are we testing?
  it('formats a whole number with decimals', () => {
    // ARRANGE: Set up the test data
    const amount = 100;

    // ACT: Call the function we're testing
    const result = formatCurrency(amount);

    // ASSERT: Check if the result is what we expect
    // Note: German locale uses . for thousands and , for decimals
    expect(result).toBe('100,00 KM');
  });

  it('formats a decimal number correctly', () => {
    const result = formatCurrency(99.99);
    expect(result).toBe('99,99 KM');
  });

  it('formats large numbers with thousand separators', () => {
    // 1000 in German format becomes "1.000"
    const result = formatCurrency(1000);
    expect(result).toBe('1.000,00 KM');
  });

  it('formats very large numbers correctly', () => {
    const result = formatCurrency(1234567.89);
    expect(result).toBe('1.234.567,89 KM');
  });

  it('handles zero', () => {
    const result = formatCurrency(0);
    expect(result).toBe('0,00 KM');
  });

  it('handles negative numbers', () => {
    const result = formatCurrency(-50);
    expect(result).toBe('-50,00 KM');
  });

  // EXERCISE: Add your own test!
  // Try testing what happens with very small decimals like 0.001
  // Hint: The function rounds to 2 decimal places
});

describe('formatCurrencyShort', () => {
  it('formats without forcing decimal places', () => {
    const result = formatCurrencyShort(100);
    expect(result).toBe('100 KM');
  });

  it('keeps existing decimals', () => {
    const result = formatCurrencyShort(99.5);
    expect(result).toBe('99,5 KM');
  });

  it('formats large numbers with thousand separators', () => {
    const result = formatCurrencyShort(10000);
    expect(result).toBe('10.000 KM');
  });
});

/**
 * EXERCISES FOR YOU:
 *
 * 1. Add a test for formatCurrency with a very small number (0.01)
 * 2. Add a test for what happens with NaN or Infinity
 * 3. Try using .toContain() instead of .toBe() to check if result contains "KM"
 *
 * TIPS:
 * - Run npm test:watch to see tests run automatically when you save
 * - A good test name describes WHAT you're testing and the EXPECTED behavior
 * - Follow the AAA pattern: Arrange, Act, Assert
 */
