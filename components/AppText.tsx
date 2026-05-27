/**
 * AppText — drop-in replacement for React Native's <Text>.
 *
 * Caps the OS font-size multiplier at 1.3× by default so XXL
 * accessibility fonts can't shatter fixed-width layouts.
 * Individual callsites can override via the maxFontSizeMultiplier prop.
 *
 * Usage:
 *   import AppText from '../components/AppText';
 *   <AppText style={styles.label}>Hello</AppText>
 *
 * For badge/chip text in tight containers pass maxFontSizeMultiplier={1}.
 * For content-heavy text where more scaling is welcome pass 1.5.
 */
import React from 'react';
import { Text, TextProps } from 'react-native';

interface AppTextProps extends TextProps {
  maxFontSizeMultiplier?: number;
}

export default function AppText({
  maxFontSizeMultiplier = 1.3,
  ...props
}: AppTextProps) {
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}
