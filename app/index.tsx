import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useApp } from "../context/AppContext";
import { formatCurrencyShort } from "../utils/currency";
import WeatherWidget from "../components/WeatherWidget";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

// ─── Sub-Components ─────────────────────────────────────────────

function GreetingHeader() {
  const hour = new Date().getHours();
  let greeting = "Dobro jutro";
  if (hour >= 12 && hour < 18) greeting = "Dobar dan";
  if (hour >= 18) greeting = "Dobro veče";

  const today = new Date().toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.greetingContainer}>
      <Text style={styles.greetingText}>{greeting} 🐝</Text>
      <Text style={styles.dateText}>{today}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
}

function StatCard({ icon, value, label, iconColor, iconBg, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  bgColor: string;
}

function QuickActionCard({ icon, label, onPress, color, bgColor }: QuickActionProps) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={14}
        color={COLORS.textMuted}
        style={styles.quickActionChevron}
      />
    </TouchableOpacity>
  );
}

interface HealthOverviewProps {
  healthy: number;
  needsAttention: number;
  total: number;
}

function HealthOverview({ healthy, needsAttention, total }: HealthOverviewProps) {
  const healthPercent = total > 0 ? (healthy / total) * 100 : 0;

  return (
    <View style={styles.healthCard}>
      <View style={styles.healthHeader}>
        <Text style={styles.healthTitle}>Zdravlje košnica</Text>
        <Text style={styles.healthPercent}>
          {total > 0 ? `${Math.round(healthPercent)}%` : "–"}
        </Text>
      </View>

      <View style={styles.healthBar}>
        <View
          style={[
            styles.healthBarFill,
            {
              width: `${healthPercent}%`,
              backgroundColor:
                healthPercent >= 80
                  ? COLORS.success
                  : healthPercent >= 50
                  ? COLORS.primary
                  : COLORS.danger,
            },
          ]}
        />
      </View>

      <View style={styles.healthStats}>
        <View style={styles.healthStat}>
          <View style={[styles.healthDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.healthStatText}>
            Zdrave: {healthy}
          </Text>
        </View>
        <View style={styles.healthStat}>
          <View style={[styles.healthDot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.healthStatText}>
            Pažnja: {needsAttention}
          </Text>
        </View>
      </View>
    </View>
  );
}

interface FinancialSnapshotProps {
  salesThisMonth: number;
  onPress: () => void;
}

function FinancialSnapshot({ salesThisMonth, onPress }: FinancialSnapshotProps) {
  return (
    <TouchableOpacity
      style={styles.financeCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.financeLeft}>
        <View style={[styles.statIconContainer, { backgroundColor: COLORS.accent.saleLight }]}>
          <Ionicons name="trending-up" size={20} color={COLORS.success} />
        </View>
        <View style={styles.financeText}>
          <Text style={styles.financeLabel}>Prodaja ovog meseca</Text>
          <Text style={styles.financeValue}>
            {formatCurrencyShort(salesThisMonth)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────

export default function HomeScreen() {
  const { state, loading, metrics } = useApp();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Učitavanje...</Text>
      </View>
    );
  }

  const queenBoxRows = state.queenBoxRows || [];
  const allQueenBoxes = queenBoxRows.flatMap((row) => row.queenBoxes);
  const matureQueenBoxes = allQueenBoxes.filter(
    (box) => box.status === "mature"
  ).length;

  const totalHives = metrics.totalHives;
  const healthyHives = metrics.healthyHives;
  const needsAttention = metrics.hivesNeedingAttention;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <GreetingHeader />

      {/* Weather */}
      <WeatherWidget />

      {/* Stat Cards */}
      <SectionHeader title="Pregled" />
      <View style={styles.statsRow}>
        <StatCard
          icon="grid"
          value={metrics.totalHives}
          label="Košnica"
          iconColor={COLORS.accent.hive}
          iconBg={COLORS.accent.hiveLight}
          onPress={() => router.push("/hive")}
        />
        <StatCard
          icon="star"
          value={matureQueenBoxes}
          label="Zrele matice"
          iconColor={COLORS.accent.queen}
          iconBg={COLORS.accent.queenLight}
          onPress={() => router.push("/queens")}
        />
        <StatCard
          icon="cube"
          value={metrics.totalNuclei}
          label="Rojevi"
          iconColor={COLORS.accent.nuclei}
          iconBg={COLORS.accent.nucleiLight}
          onPress={() => router.push("/nuclei")}
        />
        <StatCard
          icon="pricetag"
          value={metrics.nucleiForSale}
          label="Za prodaju"
          iconColor={COLORS.accent.sale}
          iconBg={COLORS.accent.saleLight}
          onPress={() => router.push("/nuclei")}
        />
      </View>

      {/* Health Overview */}
      <SectionHeader title="Stanje" />
      <HealthOverview
        healthy={healthyHives}
        needsAttention={needsAttention}
        total={totalHives}
      />

      {/* Financial Snapshot */}
      <FinancialSnapshot
        salesThisMonth={metrics.totalSalesThisMonth}
        onPress={() => router.push("/finansije")}
      />

      {/* Quick Actions */}
      <SectionHeader title="Brzi pristup" />
      <View style={styles.quickActionsGrid}>
        <QuickActionCard
          icon="grid"
          label="Košnice"
          color={COLORS.accent.hive}
          bgColor={COLORS.accent.hiveLight}
          onPress={() => router.push("/hive")}
        />
        <QuickActionCard
          icon="star"
          label="Matice"
          color={COLORS.accent.queen}
          bgColor={COLORS.accent.queenLight}
          onPress={() => router.push("/queens")}
        />
        <QuickActionCard
          icon="cube"
          label="Rojevi"
          color={COLORS.accent.nuclei}
          bgColor={COLORS.accent.nucleiLight}
          onPress={() => router.push("/nuclei")}
        />
        <QuickActionCard
          icon="wallet"
          label="Finansije"
          color={COLORS.primary}
          bgColor={COLORS.accent.hiveLight}
          onPress={() => router.push("/finansije")}
        />
        <QuickActionCard
          icon="receipt"
          label="Porudžbine"
          color={COLORS.accent.queen}
          bgColor={COLORS.accent.queenLight}
          onPress={() => router.push("/orders")}
        />
      </View>

      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },

  // ── Greeting ───────────────────────────────────────
  greetingContainer: {
    marginBottom: SPACING.xxl,
  },
  greetingText: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },

  // ── Section Header ─────────────────────────────────
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  // ── Stat Cards ─────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    ...SHADOW.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "500",
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ── Health Overview ────────────────────────────────
  healthCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
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
  healthPercent: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.success,
  },
  healthBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  healthBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  healthStats: {
    flexDirection: "row",
    gap: SPACING.xl,
  },
  healthStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthStatText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  // ── Financial Snapshot ─────────────────────────────
  financeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOW.md,
  },
  financeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  financeText: {
    gap: 2,
  },
  financeLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  financeValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // ── Quick Actions ──────────────────────────────────
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  quickAction: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOW.sm,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  quickActionChevron: {
    marginLeft: "auto",
  },

  // ── Spacer ─────────────────────────────────────────
  bottomSpacer: {
    height: SPACING.xxxl,
  },
});
