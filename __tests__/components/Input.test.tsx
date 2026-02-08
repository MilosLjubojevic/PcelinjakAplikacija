/**
 * LEARNING TESTS: Testing Form Inputs
 *
 * This file teaches you how to test form components.
 *
 * NEW CONCEPTS:
 * - fireEvent.changeText(): Simulates typing in an input
 * - Testing conditional rendering (label, error messages)
 * - Using queryByText vs getByText
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Input from '../../components/Input';

describe('Input Component', () => {
  // Testing basic rendering
  describe('rendering', () => {
    it('renders without a label when not provided', () => {
      render(<Input placeholder="Enter text" />);

      // queryByText returns null instead of throwing - good for checking absence
      expect(screen.queryByText('Label')).toBeNull();
    });

    it('renders with a label when provided', () => {
      render(<Input label="Username" placeholder="Enter username" />);

      expect(screen.getByText('Username')).toBeTruthy();
    });

    it('renders the placeholder text', () => {
      render(<Input placeholder="Type here..." />);

      expect(screen.getByPlaceholderText('Type here...')).toBeTruthy();
    });
  });

  // Testing error states
  describe('error handling', () => {
    it('does not show error message when no error', () => {
      render(<Input placeholder="Email" />);

      expect(screen.queryByText(/error/i)).toBeNull();
    });

    it('shows error message when error prop is provided', () => {
      render(<Input placeholder="Email" error="Invalid email address" />);

      expect(screen.getByText('Invalid email address')).toBeTruthy();
    });

    it('shows both label and error when both are provided', () => {
      render(
        <Input
          label="Email"
          placeholder="Enter email"
          error="This field is required"
        />
      );

      expect(screen.getByText('Email')).toBeTruthy();
      expect(screen.getByText('This field is required')).toBeTruthy();
    });
  });

  // Testing user interactions
  describe('user interactions', () => {
    it('allows text input', () => {
      const mockOnChange = jest.fn();

      render(
        <Input
          placeholder="Type here"
          onChangeText={mockOnChange}
        />
      );

      const input = screen.getByPlaceholderText('Type here');
      fireEvent.changeText(input, 'Hello World');

      expect(mockOnChange).toHaveBeenCalledWith('Hello World');
    });

    it('calls onChangeText with each keystroke simulation', () => {
      const mockOnChange = jest.fn();

      render(
        <Input
          placeholder="Search"
          onChangeText={mockOnChange}
        />
      );

      const input = screen.getByPlaceholderText('Search');

      // Simulate typing multiple times
      fireEvent.changeText(input, 'a');
      fireEvent.changeText(input, 'ab');
      fireEvent.changeText(input, 'abc');

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenLastCalledWith('abc');
    });
  });

  // Testing with different input types
  describe('input types', () => {
    it('renders numeric keyboard input', () => {
      render(
        <Input
          placeholder="Enter amount"
          keyboardType="numeric"
        />
      );

      const input = screen.getByPlaceholderText('Enter amount');
      expect(input).toBeTruthy();
    });

    it('renders password input with secure text', () => {
      render(
        <Input
          placeholder="Password"
          secureTextEntry={true}
        />
      );

      const input = screen.getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });
  });
});

/**
 * ADVANCED CONCEPTS TO EXPLORE:
 *
 * 1. TESTING CONTROLLED COMPONENTS:
 *    When the component's value is controlled by state:
 *
 *    const [value, setValue] = useState('');
 *    render(<Input value={value} onChangeText={setValue} />);
 *
 * 2. TESTING FOCUS/BLUR:
 *    fireEvent(input, 'focus');
 *    fireEvent(input, 'blur');
 *
 * 3. TESTING WITH WRAPPER COMPONENTS:
 *    Sometimes you need to wrap components with providers:
 *
 *    render(
 *      <ThemeProvider>
 *        <Input />
 *      </ThemeProvider>
 *    );
 *
 * EXERCISES:
 *
 * 1. Add a test that verifies the input can be focused
 *
 * 2. Test what happens when you pass a maxLength prop
 *
 * 3. Create a test for a multiline input (TextArea-like)
 *
 * 4. Write tests for the Modal component - it has open/close states
 */
