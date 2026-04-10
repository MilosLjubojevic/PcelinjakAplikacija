import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/designTokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBlock({ width = '100%', height = 16, borderRadius = RADIUS.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Greeting */}
      <SkeletonBlock width="60%" height={28} style={{ marginBottom: SPACING.sm }} />
      <SkeletonBlock width="40%" height={16} style={{ marginBottom: SPACING.xxl }} />

      {/* Stat cards row */}
      <SkeletonBlock width="30%" height={18} style={{ marginBottom: SPACING.md }} />
      <View style={styles.row}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.statCard}>
            <SkeletonBlock width={40} height={40} borderRadius={RADIUS.md} />
            <SkeletonBlock width="60%" height={24} style={{ marginTop: SPACING.sm }} />
            <SkeletonBlock width="80%" height={12} style={{ marginTop: SPACING.xs }} />
          </View>
        ))}
      </View>

      {/* Health overview */}
      <SkeletonBlock width="30%" height={18} style={{ marginBottom: SPACING.md, marginTop: SPACING.lg }} />
      <View style={styles.card}>
        <SkeletonBlock width="100%" height={8} borderRadius={4} style={{ marginBottom: SPACING.md }} />
        <View style={[styles.row, { gap: SPACING.xl }]}>
          <SkeletonBlock width={80} height={14} />
          <SkeletonBlock width={80} height={14} />
        </View>
      </View>

      {/* Financial snapshot */}
      <View style={[styles.card, { marginTop: SPACING.md }]}>
        <View style={[styles.row, { alignItems: 'center' }]}>
          <SkeletonBlock width={40} height={40} borderRadius={RADIUS.md} />
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <SkeletonBlock width="50%" height={14} />
            <SkeletonBlock width="30%" height={20} style={{ marginTop: SPACING.xs }} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.card, { marginBottom: SPACING.md }]}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: SPACING.md }]}>
            <SkeletonBlock width="50%" height={20} />
            <SkeletonBlock width={60} height={24} borderRadius={RADIUS.md} />
          </View>
          <SkeletonBlock width="70%" height={14} style={{ marginBottom: SPACING.sm }} />
          <SkeletonBlock width="40%" height={14} />
        </View>
      ))}
    </View>
  );
}

export function GridSkeleton({ rows = 2, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <View style={styles.container}>
      {/* Location selector */}
      <View style={[styles.row, { marginBottom: SPACING.lg }]}>
        <SkeletonBlock width="48%" height={64} borderRadius={RADIUS.lg} />
        <SkeletonBlock width="48%" height={64} borderRadius={RADIUS.lg} />
      </View>

      {/* Row containers */}
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={[styles.card, { marginBottom: SPACING.md }]}>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: SPACING.md }]}>
            <SkeletonBlock width="40%" height={20} />
            <SkeletonBlock width={30} height={24} borderRadius={RADIUS.md} />
          </View>
          <View style={[styles.row, { flexWrap: 'wrap', gap: SPACING.sm }]}>
            {Array.from({ length: cols * 2 }).map((_, i) => (
              <SkeletonBlock key={i} width={48} height={48} borderRadius={8} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default SkeletonBlock;

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.borderMedium,
  },
  container: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
});
