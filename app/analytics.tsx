import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import Card from "../components/Card";
import Button from "../components/Button";
import { ListSkeleton } from "../components/SkeletonLoader";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";
import { ExpenseCategory, IncomeCategory } from "../types";
import { expenseCategoryLabels, incomeCategoryLabels, categoryColors } from "../utils/categoryLabels";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export default function AnalyticsScreen() {
  const { state, loading, error, metrics, refreshData } = useApp();

  const analytics = useMemo(() => {
    const expenses = state.expenses || [];
    const incomes = state.incomes || [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // Monthly breakdown for current year
    const monthlyData: MonthlyData[] = [];
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
      "Jul", "Avg", "Sep", "Okt", "Nov", "Dec",
    ];

    for (let m = 0; m < 12; m++) {
      const monthIncome = incomes
        .filter((i) => {
          const d = new Date(i.date);
          return d.getMonth() === m && d.getFullYear() === currentYear;
        })
        .reduce((sum, i) => sum + i.amount, 0);

      const monthExpense = expenses
        .filter((e) => {
          const d = new Date(e.date);
          return d.getMonth() === m && d.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      monthlyData.push({
        month: monthNames[m],
        income: monthIncome,
        expenses: monthExpense,
        profit: monthIncome - monthExpense,
      });
    }

    // Income by category
    const incomeByCategory = incomes.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + i.amount;
      return acc;
    }, {} as Record<string, number>);

    // Expense by category
    const expenseByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Hive health stats
    const allHives = state.locations.flatMap((loc) =>
      loc.rows.flatMap((row) => row.hives)
    );
    const healthStats = {
      excellent: allHives.filter((h) => h.health === "good").length,
      warning: allHives.filter((h) => h.health === "bad").length,
    };

    // Sales stats
    const completedSales = state.sales.filter((s) => s.status === "completed");
    const avgSaleValue =
      completedSales.length > 0
        ? completedSales.reduce((sum, s) => sum + s.totalAmount, 0) /
          completedSales.length
        : 0;

    return {
      monthlyData,
      incomeByCategory,
      expenseByCategory,
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      healthStats,
      totalHives: allHives.length,
      completedSalesCount: completedSales.length,
      avgSaleValue,
      currentYear,
    };
  }, [state.expenses, state.incomes, state.locations, state.sales]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton count={4} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
        <Text style={styles.loadingText}>{error}</Text>
      </View>
    );
  }

  const maxMonthValue = Math.max(
    ...analytics.monthlyData.map((m) => Math.max(m.income, m.expenses)),
    1
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Card style={[styles.summaryCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.summaryLabel}>Ukupni prihodi</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {analytics.totalIncome.toLocaleString("sr-RS")} KM
          </Text>
        </Card>
        <Card style={[styles.summaryCard, { borderLeftColor: COLORS.danger }]}>
          <Text style={styles.summaryLabel}>Ukupni troškovi</Text>
          <Text style={[styles.summaryValue, { color: COLORS.danger }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {analytics.totalExpenses.toLocaleString("sr-RS")} KM
          </Text>
        </Card>
      </View>

      <Card
        style={[
          styles.profitCard,
          {
            backgroundColor:
              analytics.netProfit >= 0 ? COLORS.success : COLORS.danger,
          },
        ]}
      >
        <View style={styles.profitContent}>
          <Ionicons
            name={analytics.netProfit >= 0 ? "trending-up" : "trending-down"}
            size={28}
            color={COLORS.surface}
          />
          <View>
            <Text style={styles.profitLabel}>
              {analytics.netProfit >= 0 ? "Neto profit" : "Neto gubitak"}
            </Text>
            <Text style={styles.profitValue}>
              {Math.abs(analytics.netProfit).toLocaleString("sr-RS")} KM
            </Text>
          </View>
        </View>
      </Card>

      {/* Monthly Chart */}
      <Text style={styles.sectionTitle}>
        Mjesečni pregled ({analytics.currentYear})
      </Text>
      <Card style={styles.chartCard}>
        {analytics.monthlyData.map((month) => (
          <View key={month.month} style={styles.chartRow}>
            <Text style={styles.chartLabel}>{month.month}</Text>
            <View style={styles.chartBars}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    styles.incomeBar,
                    {
                      width: `${(month.income / maxMonthValue) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    styles.expenseBar,
                    {
                      width: `${(month.expenses / maxMonthValue) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.chartValue}>
              {month.profit >= 0 ? "+" : ""}
              {month.profit.toLocaleString("sr-RS")}
            </Text>
          </View>
        ))}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
            <Text style={styles.legendText}>Prihodi</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.legendText}>Troškovi</Text>
          </View>
        </View>
      </Card>

      {/* Income Breakdown */}
      {Object.keys(analytics.incomeByCategory).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Prihodi po kategorijama</Text>
          <Card style={styles.breakdownCard}>
            {Object.entries(analytics.incomeByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const pct =
                  analytics.totalIncome > 0
                    ? ((amount / analytics.totalIncome) * 100).toFixed(1)
                    : "0";
                return (
                  <View key={category} style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <View
                        style={[
                          styles.breakdownDot,
                          {
                            backgroundColor:
                              categoryColors[category] || COLORS.textMuted,
                          },
                        ]}
                      />
                      <Text style={styles.breakdownName}>
                        {incomeCategoryLabels[category as IncomeCategory] ||
                          category}
                      </Text>
                    </View>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.breakdownPercent}>{pct}%</Text>
                      <Text style={[styles.breakdownAmount, { color: COLORS.success }]}>
                        {amount.toLocaleString("sr-RS")} KM
                      </Text>
                    </View>
                  </View>
                );
              })}
          </Card>
        </>
      )}

      {/* Expense Breakdown */}
      {Object.keys(analytics.expenseByCategory).length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Troškovi po kategorijama</Text>
          <Card style={styles.breakdownCard}>
            {Object.entries(analytics.expenseByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => {
                const pct =
                  analytics.totalExpenses > 0
                    ? ((amount / analytics.totalExpenses) * 100).toFixed(1)
                    : "0";
                return (
                  <View key={category} style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <View
                        style={[
                          styles.breakdownDot,
                          {
                            backgroundColor:
                              categoryColors[category] || COLORS.textMuted,
                          },
                        ]}
                      />
                      <Text style={styles.breakdownName}>
                        {expenseCategoryLabels[category as ExpenseCategory] ||
                          category}
                      </Text>
                    </View>
                    <View style={styles.breakdownRight}>
                      <Text style={styles.breakdownPercent}>{pct}%</Text>
                      <Text style={[styles.breakdownAmount, { color: COLORS.danger }]}>
                        {amount.toLocaleString("sr-RS")} KM
                      </Text>
                    </View>
                  </View>
                );
              })}
          </Card>
        </>
      )}

      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>Statistika</Text>
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Ionicons name="grid" size={24} color={COLORS.accent.hive} />
          <Text style={styles.statValue}>{metrics.totalHives}</Text>
          <Text style={styles.statLabel}>Košnica</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="location" size={24} color={COLORS.accent.swarm} />
          <Text style={styles.statValue}>{metrics.totalLocations}</Text>
          <Text style={styles.statLabel}>Lokacija</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="cart" size={24} color={COLORS.accent.sale} />
          <Text style={styles.statValue}>{analytics.completedSalesCount}</Text>
          <Text style={styles.statLabel}>Prodaja</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="cash" size={24} color={COLORS.primary} />
          <Text style={styles.statValue}>
            {analytics.avgSaleValue > 0
              ? `${Math.round(analytics.avgSaleValue).toLocaleString("sr-RS")}`
              : "0"}
          </Text>
          <Text style={styles.statLabel}>Prosjek KM</Text>
        </Card>
      </View>

      <View style={{ height: SPACING.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
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
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    borderLeftWidth: 4,
    paddingVertical: SPACING.lg,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
  },
  profitCard: {
    marginBottom: SPACING.xxl,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  profitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
  },
  profitLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.surface,
    opacity: 0.9,
  },
  profitValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700",
    color: COLORS.surface,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  chartCard: {
    marginBottom: SPACING.xxl,
    paddingVertical: SPACING.md,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  chartLabel: {
    minWidth: 28,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  chartBars: {
    flex: 1,
    gap: 2,
  },
  barContainer: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 3,
    minWidth: 1,
  },
  incomeBar: {
    backgroundColor: COLORS.success,
  },
  expenseBar: {
    backgroundColor: COLORS.danger,
  },
  chartValue: {
    minWidth: 50,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: "right",
    fontWeight: "500",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.xl,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  breakdownCard: {
    marginBottom: SPACING.xxl,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownName: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  breakdownRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  breakdownPercent: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  breakdownAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 0,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    flexBasis: "45%",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
