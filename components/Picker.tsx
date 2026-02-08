import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants/designTokens';

export interface PickerOption {
  label: string;
  value: string;
}

interface PickerProps {
  label?: string;
  value: string;
  options: PickerOption[];
  onValueChange: (value: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
  placeholder?: string;
}

export default function Picker({
  label,
  value,
  options,
  onValueChange,
  error,
  containerStyle,
  placeholder = 'Izaberi...',
}: PickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.pickerButton, error && styles.pickerButtonError, isOpen && styles.pickerButtonOpen]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                option.value === value && styles.selectedOption,
                index === options.length - 1 && styles.optionLast,
              ]}
              onPress={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.optionText,
                  option.value === value && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
              {option.value === value && (
                <Ionicons name="checkmark" size={18} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
    zIndex: 1,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  pickerButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonOpen: {
    borderColor: COLORS.primary,
  },
  pickerButtonError: {
    borderColor: COLORS.danger,
  },
  pickerText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  optionsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.lg,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  selectedOption: {
    backgroundColor: COLORS.accent.hiveLight,
  },
  optionText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  errorText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },
});
