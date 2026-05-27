import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import AppText from './AppText';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from '../constants/designTokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: COLORS.primary, color: COLORS.surface };
      case 'secondary':
        return { backgroundColor: COLORS.surface, color: COLORS.primaryDark, borderColor: COLORS.borderMedium, borderWidth: 1.5 };
      case 'danger':
        return { backgroundColor: COLORS.danger, color: COLORS.surface };
      case 'success':
        return { backgroundColor: COLORS.success, color: COLORS.surface };
      default:
        return { backgroundColor: COLORS.primary, color: COLORS.surface };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: variantStyles.backgroundColor },
        variant === 'secondary' && { borderWidth: variantStyles.borderWidth, borderColor: variantStyles.borderColor },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.color} />
      ) : (
        <AppText style={[styles.text, { color: variantStyles.color }, textStyle]}>{title}</AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...SHADOW.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
