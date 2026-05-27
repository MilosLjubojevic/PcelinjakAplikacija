import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import AppText from "./AppText";
import { COLORS, FONT_SIZE, RADIUS, SPACING } from "../constants/designTokens";

type UpdatePhase = "checking" | "downloading" | "installing";

interface UpdateScreenProps {
  phase: UpdatePhase;
}

const PHASE_LABEL: Record<UpdatePhase, string> = {
  checking: "Provjera ažuriranja...",
  downloading: "Preuzimanje ažuriranja...",
  installing: "Instalacija — nemojte zatvarati aplikaciju",
};

const PHASE_ICON: Record<UpdatePhase, keyof typeof Ionicons.glyphMap> = {
  checking: "search-outline",
  downloading: "cloud-download-outline",
  installing: "sync-outline",
};

export default function UpdateScreen({ phase }: UpdateScreenProps) {
  // Rotating ring animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  // Pulsing bee icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Logo cluster */}
      <View style={styles.logoWrap}>
        {/* Spinning ring */}
        <Animated.View
          style={[styles.spinRing, { transform: [{ rotate: spin }] }]}
        />

        {/* Pulsing bee */}
        <Animated.View
          style={[styles.beeCircle, { transform: [{ scale: pulseAnim }] }]}
        >
          <AppText style={styles.beeEmoji}>🐝</AppText>
        </Animated.View>
      </View>

      {/* App name */}
      <AppText style={styles.appName}>Pčelinjak Ljubojević</AppText>

      {/* Phase icon + label */}
      <View style={styles.phaseRow}>
        <Ionicons
          name={PHASE_ICON[phase]}
          size={18}
          color={COLORS.primary}
          style={styles.phaseIcon}
        />
        <AppText style={styles.phaseLabel}>{PHASE_LABEL[phase]}</AppText>
      </View>

      {/* Dots progress indicator */}
      <DotsLoader phase={phase} />

      <AppText style={styles.hint}>
        Ažuriranje se vrši automatski, molimo sačekajte.
      </AppText>
    </View>
  );
}

// ─── Animated dots ───────────────────────────────────────────────

function DotsLoader({ phase }: { phase: UpdatePhase }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const delay = 200;
    const duration = 500;

    const animate = (dot: Animated.Value, offset: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(offset),
          Animated.timing(dot, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(delay * 2),
        ])
      );

    animate(dot1, 0).start();
    animate(dot2, delay).start();
    animate(dot3, delay * 2).start();
  }, []);

  return (
    <View style={styles.dots}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                phase === "installing" ? COLORS.success : COLORS.primary,
              opacity: dot,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xxxl,
  },

  // ── Logo ──────────────────────────────────
  logoWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xxl,
  },
  spinRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  beeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent.hiveLight,
    alignItems: "center",
    justifyContent: "center",
  },
  beeEmoji: {
    fontSize: 36,
  },

  // ── Text ──────────────────────────────────
  appName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    textAlign: "center",
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  phaseIcon: {
    marginRight: SPACING.sm,
  },
  phaseLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  hint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: SPACING.xl,
    lineHeight: 18,
  },

  // ── Dots ──────────────────────────────────
  dots: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
});
