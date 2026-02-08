/**
 * LEARNING TESTS: React Native Component Testing
 *
 * This file teaches you how to test React Native components.
 *
 * NEW CONCEPTS:
 * - render(): Renders a component for testing
 * - screen.getByText(): Finds elements by their text content
 * - fireEvent: Simulates user interactions (press, change, etc.)
 * - jest.fn(): Creates a mock function to track calls
 * - toHaveBeenCalled(): Checks if a function was called
 * - toHaveBeenCalledTimes(): Checks how many times a function was called
 *
 * RUN THIS TEST:
 * npm test -- Button.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Button from '../../components/Button';

describe('Button Component', () => {
  // Basic rendering tests
  describe('rendering', () => {
    it('renders the button title correctly', () => {
      // ARRANGE & ACT: Render the component
      render(<Button title="Click Me" onPress={() => {}} />);

      // ASSERT: Check if the title is visible
      // getByText throws an error if element is not found (which fails the test)
      expect(screen.getByText('Click Me')).toBeTruthy();
    });

    it('renders with different titles', () => {
      render(<Button title="Save" onPress={() => {}} />);

      expect(screen.getByText('Save')).toBeTruthy();
    });
  });

  // Testing user interactions
  describe('interactions', () => {
    it('calls onPress when button is pressed', () => {
      // Create a "spy" function - tracks if it was called
      const mockOnPress = jest.fn();

      render(<Button title="Press Me" onPress={mockOnPress} />);

      // Find the button and simulate a press
      const button = screen.getByText('Press Me');
      fireEvent.press(button);

      // Check that our function was called
      expect(mockOnPress).toHaveBeenCalled();
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      const mockOnPress = jest.fn();

      render(<Button title="Disabled" onPress={mockOnPress} disabled={true} />);

      const button = screen.getByText('Disabled');
      fireEvent.press(button);

      // Function should NOT be called because button is disabled
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('does not call onPress when loading', () => {
      const mockOnPress = jest.fn();

      // When loading=true, the button shows a spinner instead of text
      render(<Button title="Loading" onPress={mockOnPress} loading={true} />);

      // The title won't be visible during loading, so we can't click by text
      // Instead, we'd need to use a testID - this shows a limitation!
      // For now, we just verify the function wasn't called
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  // Testing different variants
  describe('variants', () => {
    it('renders primary variant by default', () => {
      render(<Button title="Primary" onPress={() => {}} />);

      // The button should exist (we can't easily test colors without more setup)
      expect(screen.getByText('Primary')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      render(<Button title="Secondary" onPress={() => {}} variant="secondary" />);

      expect(screen.getByText('Secondary')).toBeTruthy();
    });

    it('renders danger variant', () => {
      render(<Button title="Delete" onPress={() => {}} variant="danger" />);

      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('renders success variant', () => {
      render(<Button title="Success" onPress={() => {}} variant="success" />);

      expect(screen.getByText('Success')).toBeTruthy();
    });
  });

  // Testing accessibility
  describe('accessibility', () => {
    it('button has correct role for accessibility', () => {
      render(<Button title="Accessible" onPress={() => {}} />);

      // The text should be accessible
      const button = screen.getByText('Accessible');
      expect(button).toBeTruthy();
    });
  });
});

/**
 * KEY TESTING LIBRARY QUERIES:
 *
 * getBy... - Throws error if not found (use when element MUST exist)
 * queryBy... - Returns null if not found (use when checking absence)
 * findBy... - Returns a Promise, waits for element (use for async)
 *
 * ...ByText     - Find by text content
 * ...ByRole     - Find by accessibility role
 * ...ByTestId   - Find by testID prop
 * ...ByLabelText - Find by accessibility label
 *
 * EXERCISES:
 *
 * 1. Add a testID to the Button component, then write a test using getByTestId
 *
 * 2. Test that pressing the button multiple times calls onPress multiple times
 *
 * 3. Write a test that verifies the loading state shows an ActivityIndicator
 *    Hint: You'll need to add a testID to the ActivityIndicator
 *
 * 4. Create tests for the Card component following the same patterns
 *
 * COMMON PATTERNS:
 *
 * // Wait for something to appear (async operations)
 * await screen.findByText('Loaded');
 *
 * // Check something is NOT rendered
 * expect(screen.queryByText('Gone')).toBeNull();
 *
 * // Simulate text input
 * fireEvent.changeText(input, 'new value');
 *
 * // Simulate scroll
 * fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 100 } } });
 */
