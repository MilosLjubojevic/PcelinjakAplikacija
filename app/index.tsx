import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AppText from "../components/AppText";
import Button from "../components/Button";
import { DashboardSkeleton } from "../components/SkeletonLoader";
import WeatherWidget from "../components/WeatherWidget";
import {
  COLORS,
  FONT_SIZE,
  RADIUS,
  SHADOW,
  SPACING,
} from "../constants/designTokens";
import { useApp } from "../context/AppContext";
import { formatCurrencyShort } from "../utils/currency";

// ─── Hero Stat Card (2×2 grid) ──────────────────────────────────

interface HeroStatProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  chip?: string;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  onPress: () => void;
}

function HeroStat({
  icon,
  value,
  label,
  chip,
  iconColor,
  iconBg,
  accentColor,
  onPress,
}: HeroStatProps) {
  return (
    <TouchableOpacity
      style={[styles.heroStat, { borderTopColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.heroStatTop}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        {chip ? (
          <View style={[styles.chip, { backgroundColor: iconBg }]}>
            <AppText style={[styles.chipText, { color: iconColor }]} maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={1}>{chip}</AppText>
          </View>
        ) : null}
      </View>
      <AppText style={styles.heroStatValue} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit numberOfLines={1}>{value}</AppText>
      <AppText style={styles.heroStatLabel} maxFontSizeMultiplier={1} adjustsFontSizeToFit numberOfLines={1}>{label}</AppText>
    </TouchableOpacity>
  );
}

// ─── Quick Action Tile ───────────────────────────────────────────

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  bgColor: string;
}

function QuickActionTile({
  icon,
  label,
  onPress,
  color,
  bgColor,
}: QuickActionProps) {
  return (
    <TouchableOpacity
      style={styles.quickTile}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.quickTileIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <AppText style={styles.quickTileLabel} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

// ─── Health Card ─────────────────────────────────────────────────

interface HealthCardProps {
  healthy: number;
  needsAttention: number;
  total: number;
}

function HealthCard({ healthy, needsAttention, total }: HealthCardProps) {
  const pct = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const barColor =
    pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.primary : COLORS.danger;
  const chipBg =
    pct >= 80
      ? COLORS.successLight
      : pct >= 50
        ? COLORS.accent.hiveLight
        : COLORS.dangerLight;

  return (
    <View style={styles.healthCard}>
      <View style={styles.healthHeader}>
        <AppText style={styles.healthTitle}>Zdravlje košnica</AppText>
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <AppText
            style={[styles.chipText, { color: barColor, fontWeight: "700" }]}
            maxFontSizeMultiplier={1}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {total > 0 ? `${pct}%` : "–"}
          </AppText>
        </View>
      </View>
      <View style={styles.healthBarTrack}>
        <View
          style={[
            styles.healthBarFill,
            { width: `${pct}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
      <View style={styles.healthRow}>
        <View style={styles.healthItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
          <AppText style={styles.healthItemText} maxFontSizeMultiplier={1.2}>
            Zdrave: <AppText style={styles.healthItemBold}>{healthy}</AppText>
          </AppText>
        </View>
        <View style={styles.healthItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
          <AppText style={styles.healthItemText} maxFontSizeMultiplier={1.2}>
            Pažnja: <AppText style={styles.healthItemBold}>{needsAttention}</AppText>
          </AppText>
        </View>
        <View style={styles.healthItem}>
          <View style={[styles.dot, { backgroundColor: COLORS.textMuted }]} />
          <AppText style={styles.healthItemText} maxFontSizeMultiplier={1.2}>
            Ukupno: <AppText style={styles.healthItemBold}>{total}</AppText>
          </AppText>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────

export default function HomeScreen() {
  const { state, loading, error, metrics, refreshData } = useApp();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.container}>
        <DashboardSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
        <AppText style={styles.errorText}>{error}</AppText>
        <Button
          title="Pokušaj ponovo"
          onPress={refreshData}
          style={{ marginTop: SPACING.md }}
        />
      </View>
    );
  }

  const allQueenBoxes = (state.queenBoxRows || []).flatMap((r) => r.queenBoxes);
  const matureQueenBoxes = allQueenBoxes.filter(
    (b) => b.status === "mature",
  ).length;
  const totalHivesAndSwarms = metrics.totalHives + metrics.totalNuclei;

  const now = new Date();
  const getUtcDateKey = (date: Date) =>
    `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  const hivesForInspectionToday = state.locations
    .flatMap((loc) => loc.rows.flatMap((row) => row.hives))
    .filter((h) => {
      if (!h.scheduledInspection) return false;
      const scheduledDate = new Date(h.scheduledInspection);
      return getUtcDateKey(scheduledDate) === getUtcDateKey(now);
    }).length;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Dobro jutro" : hour < 18 ? "Dobar dan" : "Dobro veče";
  const today = new Date().toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Greeting ─────────────────────────────── */}
      <View style={styles.greetingSection}>
        <AppText style={styles.greetingTitle}>{greeting} 🐝</AppText>
        <AppText style={styles.greetingDate}>{today}</AppText>
      </View>

      {/* ── Weather ──────────────────────────────── */}
      <WeatherWidget />

      {/* ── 2×2 Hero Stats ───────────────────────── */}
      <AppText style={styles.sectionTitle} maxFontSizeMultiplier={1}>Pregled</AppText>
      <View style={styles.heroGrid}>
        <HeroStat
          icon="grid"
          value={metrics.totalHives}
          label="KOŠNICA"
          iconColor={COLORS.accent.hive}
          iconBg={COLORS.accent.hiveLight}
          accentColor={COLORS.accent.hive}
          onPress={() => router.push("/hive")}
        />
        <HeroStat
          icon="star"
          value={matureQueenBoxes}
          label="ZRELE MATICE"
          iconColor={COLORS.accent.queen}
          iconBg={COLORS.accent.queenLight}
          accentColor={COLORS.accent.queen}
          onPress={() => router.push("/queens")}
        />
        <HeroStat
          icon="cube"
          value={metrics.totalNuclei}
          label="ROJEVI"
          iconColor={COLORS.accent.swarm}
          iconBg={COLORS.accent.swarmLight}
          accentColor={COLORS.accent.swarm}
          onPress={() => router.push("/hive")}
        />
        <HeroStat
          icon="trending-up"
          value={formatCurrencyShort(metrics.totalSalesThisMonth)}
          label="PRIHOD"
          chip="ovaj mj."
          iconColor={COLORS.success}
          iconBg={COLORS.successLight}
          accentColor={COLORS.success}
          onPress={() => router.push("/finansije")}
        />
      </View>

      {/* ── Combined total ───────────────────────── */}
      <TouchableOpacity
        style={styles.totalCard}
        onPress={() => router.push("/hive")}
        activeOpacity={0.75}
      >
        <View style={styles.totalLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: COLORS.accent.hiveLight },
            ]}
          >
            <Ionicons name="layers" size={18} color={COLORS.accent.hive} />
          </View>
          <View>
            <AppText style={styles.totalCardTitle} numberOfLines={1} adjustsFontSizeToFit>Ukupno košnica i rojeva</AppText>
            <AppText style={styles.totalCardSub} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>
              {metrics.totalHives} košnica · {metrics.totalNuclei} rojeva
            </AppText>
          </View>
        </View>
        <View style={styles.totalRight}>
          <AppText style={styles.totalCardValue} maxFontSizeMultiplier={1.2}>{totalHivesAndSwarms}</AppText>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>

      {/* ── Health ───────────────────────────────── */}
      <AppText style={styles.sectionTitle} maxFontSizeMultiplier={1}>Stanje</AppText>
      <HealthCard
        healthy={metrics.healthyHives}
        needsAttention={metrics.hivesNeedingAttention}
        total={metrics.totalHives}
      />
      <TouchableOpacity
        style={styles.inspectionButton}
        activeOpacity={0.75}
        onPress={() => router.push("/pregled")}
      >
        <View
          style={[styles.iconBox, { backgroundColor: COLORS.accent.hiveLight }]}
        >
          <Ionicons name="search" size={16} color={COLORS.accent.hive} />
        </View>
        <AppText style={styles.inspectionButtonLabel}>Košnice za pregled</AppText>
        {hivesForInspectionToday > 0 ? (
          <View
            style={[
              styles.inspectionComingSoon,
              { backgroundColor: COLORS.danger },
            ]}
          >
            <AppText
              style={[
                styles.inspectionComingSoonText,
                { color: COLORS.surface },
              ]}
              maxFontSizeMultiplier={1}
            >
              {hivesForInspectionToday}
            </AppText>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* ── Quick Actions ────────────────────────── */}
      <AppText style={styles.sectionTitle} maxFontSizeMultiplier={1}>Brzi pristup</AppText>
      <View style={styles.quickGrid}>
        <QuickActionTile
          icon="grid"
          label="Košnice"
          color={COLORS.accent.hive}
          bgColor={COLORS.accent.hiveLight}
          onPress={() => router.push("/hive")}
        />
        <QuickActionTile
          icon="star"
          label="Matice"
          color={COLORS.accent.queen}
          bgColor={COLORS.accent.queenLight}
          onPress={() => router.push("/queens")}
        />
        <QuickActionTile
          icon="wallet"
          label="Finansije"
          color={COLORS.accent.finance}
          bgColor={COLORS.accent.financeLight}
          onPress={() => router.push("/finansije")}
        />
        <QuickActionTile
          icon="receipt"
          label="Porudžbine"
          color={COLORS.accent.queen}
          bgColor={COLORS.accent.queenLight}
          onPress={() => router.push("/orders")}
        />
      </View>

      <View style={{ height: SPACING.xxxl }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xxxl,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.danger,
    textAlign: "center",
    marginTop: SPACING.md,
  },

  // ── Greeting ──────────────────────────────
  greetingSection: {
    marginBottom: SPACING.xxl,
  },
  greetingEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1.4,
    marginBottom: SPACING.xs,
  },
  greetingTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  greetingDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },

  // ── Section Title ─────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: SPACING.md,
    marginTop: SPACING.xxl,
  },

  // ── Shared icon box ───────────────────────
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Chip ──────────────────────────────────
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // ── Hero 2×2 Grid ─────────────────────────
  heroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  heroStat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderTopWidth: 3,
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  heroStatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  heroStatValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },

  // ── Total Card ────────────────────────────
  totalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    ...SHADOW.md,
  },
  totalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    flex: 1,
  },
  totalRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  totalCardTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  totalCardSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  totalCardValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.accent.hive,
  },

  // ── Health Card ───────────────────────────
  healthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  healthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  healthTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  healthBarTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  healthBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  healthRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    rowGap: SPACING.xs,
  },
  healthItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  healthItemText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  healthItemBold: {
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  // ── Inspection Button ─────────────────────
  inspectionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginTop: SPACING.md,
    ...SHADOW.sm,
  },
  inspectionButtonLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  inspectionComingSoon: {
    backgroundColor: COLORS.accent.hiveLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  inspectionComingSoonText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.accent.hive,
  },

  // ── Quick Actions ─────────────────────────
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  quickTile: {
    flexBasis: "30%",
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    gap: SPACING.sm,
    ...SHADOW.sm,
    minHeight: 84,
    justifyContent: "center",
  },
  quickTileIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTileLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});
