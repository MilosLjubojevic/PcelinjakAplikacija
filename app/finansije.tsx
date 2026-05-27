import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useState, useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AppText from "../components/AppText";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Picker from "../components/Picker";
import { ListSkeleton } from "../components/SkeletonLoader";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";
import { useApp } from "../context/AppContext";
import { Expense, ExpenseCategory, Income, IncomeCategory, FinanceSummary } from "../types";
import { expenseCategoryOptions, incomeCategoryOptions, getExpenseCategoryLabel, getIncomeCategoryLabel, getCategoryColor } from "../utils/categoryLabels";
import { formatDate } from "../utils/dateUtils";

// ─── Category Icon Map ───────────────────────────────────────────
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  equipment: "build",
  feed: "leaf",
  medication: "medical",
  maintenance: "hammer",
  transportation: "car",
  packaging: "cube",
  "honey-sale": "water",
  "nucleus-sale": "bug",
  "queen-sale": "star",
  "hive-sale": "grid",
  "wax-sale": "flame",
  "pollen-sale": "color-filter",
  pollination: "flower",
  other: "ellipsis-horizontal",
};

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  return categoryIcons[category] || "ellipsis-horizontal";
}

// ─── Monthly Chart Component ─────────────────────────────────────
interface MonthlyDataPoint {
  label: string;
  income: number;
  expense: number;
}

function MonthlyChart({ data }: { data: MonthlyDataPoint[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((month, i) => (
          <View key={i} style={chartStyles.monthCol}>
            <View style={chartStyles.barsGroup}>
              <View style={chartStyles.barWrapper}>
                <View
                  style={[
                    chartStyles.bar,
                    chartStyles.incomeBar,
                    { height: Math.max(4, (month.income / maxVal) * 80) },
                  ]}
                />
              </View>
              <View style={chartStyles.barWrapper}>
                <View
                  style={[
                    chartStyles.bar,
                    chartStyles.expenseBar,
                    { height: Math.max(4, (month.expense / maxVal) * 80) },
                  ]}
                />
              </View>
            </View>
            <AppText style={chartStyles.monthLabel}>{month.label}</AppText>
          </View>
        ))}
      </View>
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: COLORS.info }]} />
          <AppText style={chartStyles.legendText}>Prihodi</AppText>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: COLORS.danger }]} />
          <AppText style={chartStyles.legendText}>Troškovi</AppText>
        </View>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    paddingTop: SPACING.sm,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 96,
    paddingBottom: SPACING.sm,
  },
  monthCol: {
    flex: 1,
    alignItems: "center",
  },
  barsGroup: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  barWrapper: {
    justifyContent: "flex-end",
    height: 80,
  },
  bar: {
    width: 10,
    borderRadius: 3,
  },
  incomeBar: {
    backgroundColor: COLORS.info,
    opacity: 0.85,
  },
  expenseBar: {
    backgroundColor: COLORS.danger,
    opacity: 0.7,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 4,
    textTransform: "capitalize",
  },
  legend: {
    flexDirection: "row",
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});

// ─── Main Screen ─────────────────────────────────────────────────
export default function FinansijeScreen() {
  const { state, loading, error, addExpense, updateExpense, deleteExpense, addIncome, updateIncome, deleteIncome, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");
  const [modalType, setModalType] = useState<"expense" | "income">("expense");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: "equipment" as ExpenseCategory | IncomeCategory,
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      category: modalType === "expense" ? "equipment" : "honey-sale",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  const openAddExpenseModal = () => {
    setModalType("expense");
    setActiveTab("expense");
    setEditingExpense(null);
    setEditingIncome(null);
    setFormData({ category: "equipment", description: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    setModalVisible(true);
  };

  const openAddIncomeModal = () => {
    setModalType("income");
    setActiveTab("income");
    setEditingExpense(null);
    setEditingIncome(null);
    setFormData({ category: "honey-sale", description: "", amount: "", date: new Date().toISOString().split("T")[0], notes: "" });
    setModalVisible(true);
  };

  const openEditExpenseModal = (expense: Expense) => {
    setModalType("expense");
    setEditingExpense(expense);
    setEditingIncome(null);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: new Date(expense.date).toISOString().split("T")[0],
      notes: expense.notes || "",
    });
    setModalVisible(true);
  };

  const openEditIncomeModal = (income: Income) => {
    setModalType("income");
    setEditingIncome(income);
    setEditingExpense(null);
    setFormData({
      category: income.category,
      description: income.description,
      amount: income.amount.toString(),
      date: new Date(income.date).toISOString().split("T")[0],
      notes: income.notes || "",
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.description || !formData.amount) return;
    setSaving(true);
    const now = new Date();

    if (modalType === "expense") {
      const expenseData = {
        category: formData.category as ExpenseCategory,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        notes: formData.notes || undefined,
      };
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await addExpense({ id: Crypto.randomUUID(), ...expenseData, createdAt: now, updatedAt: now });
      }
    } else {
      const incomeData = {
        category: formData.category as IncomeCategory,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        notes: formData.notes || undefined,
      };
      if (editingIncome) {
        await updateIncome(editingIncome.id, incomeData);
      } else {
        await addIncome({ id: Crypto.randomUUID(), ...incomeData, createdAt: now, updatedAt: now });
      }
    }

    setSaving(false);
    setModalVisible(false);
    resetForm();
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert("Obriši trošak", "Da li ste sigurni da želite obrisati ovaj trošak?", [
      { text: "Otkaži", style: "cancel" },
      { text: "Obriši", style: "destructive", onPress: () => deleteExpense(id) },
    ]);
  };

  const handleDeleteIncome = (id: string) => {
    Alert.alert("Obriši prihod", "Da li ste sigurni da želite obrisati ovaj prihod?", [
      { text: "Otkaži", style: "cancel" },
      { text: "Obriši", style: "destructive", onPress: () => deleteIncome(id) },
    ]);
  };

  const summary = useMemo((): FinanceSummary => {
    const expenses = state.expenses || [];
    const incomes = state.incomes || [];
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<ExpenseCategory, number>);
    const incomeByCategory = incomes.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + i.amount;
      return acc;
    }, {} as Record<IncomeCategory, number>);
    return { totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, expensesByCategory, incomeByCategory };
  }, [state.expenses, state.incomes]);

  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const income = (state.incomes || [])
        .filter((inc) => { const d = new Date(inc.date); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((sum, inc) => sum + inc.amount, 0);
      const expense = (state.expenses || [])
        .filter((exp) => { const d = new Date(exp.date); return d.getFullYear() === year && d.getMonth() === month; })
        .reduce((sum, exp) => sum + exp.amount, 0);
      return {
        label: date.toLocaleDateString("sr-Latn-RS", { month: "short" }),
        income,
        expense,
      };
    });
  }, [state.incomes, state.expenses]);

  const sortedIncomes = useMemo(
    () => [...(state.incomes || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.incomes]
  );
  const sortedExpenses = useMemo(
    () => [...(state.expenses || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.expenses]
  );

  const isProfit = summary.netProfit >= 0;
  const profitColor = isProfit ? COLORS.success : COLORS.danger;
  const profitBg = isProfit ? COLORS.successLight : COLORS.dangerLight;

  if (loading) {
    return <View style={styles.container}><ListSkeleton count={4} /></View>;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
        <AppText style={styles.errorText}>{error}</AppText>
        <Button title="Pokušaj ponovo" onPress={refreshData} style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  const activeCategoryData = activeTab === "income" ? summary.incomeByCategory : summary.expensesByCategory;
  const totalForTab = activeTab === "income" ? summary.totalIncome : summary.totalExpenses;
  const getCategoryLabel = activeTab === "income" ? getIncomeCategoryLabel : getExpenseCategoryLabel;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Profit Hero ──────────────────────── */}
        <View style={[styles.profitHero, { borderTopColor: profitColor }]}>
          <View style={styles.profitHeroTop}>
            <AppText style={styles.eyebrow}>UKUPNI PROFIT</AppText>
            <View style={[styles.profitChip, { backgroundColor: profitBg }]}>
              <Ionicons name={isProfit ? "trending-up" : "trending-down"} size={12} color={profitColor} />
              <AppText style={[styles.profitChipText, { color: profitColor }]}>
                {isProfit ? "Profit" : "Gubitak"}
              </AppText>
            </View>
          </View>
          <AppText style={[styles.profitAmount, { color: COLORS.textPrimary }]}>
            {Math.abs(summary.netProfit).toLocaleString("sr-RS")}
            <AppText style={styles.profitCurrency}> KM</AppText>
          </AppText>
        </View>

        {/* ── Income / Expense Split ───────────── */}
        <View style={styles.splitRow}>
          <View style={[styles.splitCard, { borderTopColor: COLORS.success }]}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="trending-up" size={16} color={COLORS.success} />
            </View>
            <AppText style={styles.splitEyebrow}>PRIHODI</AppText>
            <AppText style={[styles.splitAmount, { color: COLORS.success }]}>
              {summary.totalIncome.toLocaleString("sr-RS")}
              <AppText style={styles.splitCurrency}> KM</AppText>
            </AppText>
            <AppText style={styles.splitCount} maxFontSizeMultiplier={1.2} numberOfLines={1}>{(state.incomes || []).length} stavki</AppText>
          </View>

          <View style={[styles.splitCard, { borderTopColor: COLORS.danger }]}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="trending-down" size={16} color={COLORS.danger} />
            </View>
            <AppText style={styles.splitEyebrow}>TROŠKOVI</AppText>
            <AppText style={[styles.splitAmount, { color: COLORS.danger }]}>
              {summary.totalExpenses.toLocaleString("sr-RS")}
              <AppText style={styles.splitCurrency}> KM</AppText>
            </AppText>
            <AppText style={styles.splitCount} maxFontSizeMultiplier={1.2} numberOfLines={1}>{(state.expenses || []).length} stavki</AppText>
          </View>
        </View>

        {/* ── Monthly Chart ────────────────────── */}
        <AppText style={styles.sectionLabel} maxFontSizeMultiplier={1} numberOfLines={1}>ANALIZA</AppText>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Mesečna analiza</AppText>
          <MonthlyChart data={monthlyData} />
        </View>

        {/* ── Transactions ─────────────────────── */}
        <AppText style={styles.sectionLabel} maxFontSizeMultiplier={1} numberOfLines={1}>TRANSAKCIJE</AppText>

        {/* Tab Toggle */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "income" && styles.tabBtnActive]}
            onPress={() => setActiveTab("income")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="arrow-up-circle"
              size={14}
              color={activeTab === "income" ? COLORS.surface : COLORS.textSecondary}
            />
            <AppText style={[styles.tabText, activeTab === "income" && styles.tabTextActive]}>
              Prihodi
            </AppText>
            <View style={[styles.tabBadge, activeTab === "income" && styles.tabBadgeActive]}>
              <AppText style={[styles.tabBadgeText, activeTab === "income" && styles.tabBadgeTextActive]}>
                {(state.incomes || []).length}
              </AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "expense" && styles.tabBtnActiveExpense]}
            onPress={() => setActiveTab("expense")}
            activeOpacity={0.75}
          >
            <Ionicons
              name="arrow-down-circle"
              size={14}
              color={activeTab === "expense" ? COLORS.surface : COLORS.textSecondary}
            />
            <AppText style={[styles.tabText, activeTab === "expense" && styles.tabTextActive]}>
              Troškovi
            </AppText>
            <View style={[styles.tabBadge, activeTab === "expense" && styles.tabBadgeActiveExpense]}>
              <AppText style={[styles.tabBadgeText, activeTab === "expense" && styles.tabBadgeTextActive]}>
                {(state.expenses || []).length}
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Category Breakdown */}
        {Object.keys(activeCategoryData).length > 0 && (
          <View style={styles.categoryCard}>
            {(Object.entries(activeCategoryData) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount], index, arr) => {
                const pct = totalForTab > 0 ? (amount / totalForTab) * 100 : 0;
                const color = getCategoryColor(category as any);
                return (
                  <View key={category} style={[styles.categoryRow, index === arr.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.catIconBox, { backgroundColor: color + "22" }]}>
                      <Ionicons name={getCategoryIcon(category)} size={13} color={color} />
                    </View>
                    <View style={styles.categoryMiddle}>
                      <AppText style={styles.categoryName}>{getCategoryLabel(category as any)}</AppText>
                      <View style={styles.categoryBarTrack}>
                        <View style={[styles.categoryBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                      </View>
                    </View>
                    <AppText style={[styles.categoryAmount, { color }]}>
                      {amount.toLocaleString("sr-RS")} KM
                    </AppText>
                  </View>
                );
              })}
          </View>
        )}

        {/* Transaction List */}
        {activeTab === "income" ? (
          sortedIncomes.length === 0 ? (
            <EmptyState icon="trending-up-outline" title="Nema prihoda" message="Dodajte prihode da biste pratili finansije." />
          ) : (
            sortedIncomes.map((income) => {
              const color = getCategoryColor(income.category);
              return (
                <View key={income.id} style={styles.txCard}>
                  <View style={[styles.txIconBox, { backgroundColor: color + "22" }]}>
                    <Ionicons name={getCategoryIcon(income.category)} size={20} color={color} />
                  </View>
                  <View style={styles.txMiddle}>
                    <AppText style={styles.txDescription} numberOfLines={1}>{income.description}</AppText>
                    <View style={styles.txMeta}>
                      <View style={[styles.txCategoryChip, { backgroundColor: color + "22" }]}>
                        <AppText style={[styles.txCategoryText, { color }]}>
                          {getIncomeCategoryLabel(income.category)}
                        </AppText>
                      </View>
                      <AppText style={styles.txDate}>{formatDate(income.date)}</AppText>
                    </View>
                    {income.notes ? <AppText style={styles.txNotes} numberOfLines={1}>{income.notes}</AppText> : null}
                  </View>
                  <View style={styles.txRight}>
                    <AppText style={styles.txAmountIncome}>+{income.amount.toLocaleString("sr-RS")}</AppText>
                    <AppText style={styles.txCurrency}>KM</AppText>
                    <View style={styles.txActions}>
                      <TouchableOpacity onPress={() => openEditIncomeModal(income)} style={styles.txActionBtn}>
                        <Ionicons name="create-outline" size={16} color={COLORS.primaryDark} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteIncome(income.id)} style={styles.txActionBtn}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )
        ) : (
          sortedExpenses.length === 0 ? (
            <EmptyState icon="wallet-outline" title="Nema troškova" message="Dodajte troškove da biste pratili finansije." />
          ) : (
            sortedExpenses.map((expense) => {
              const color = getCategoryColor(expense.category);
              return (
                <View key={expense.id} style={styles.txCard}>
                  <View style={[styles.txIconBox, { backgroundColor: color + "22" }]}>
                    <Ionicons name={getCategoryIcon(expense.category)} size={20} color={color} />
                  </View>
                  <View style={styles.txMiddle}>
                    <AppText style={styles.txDescription} numberOfLines={1}>{expense.description}</AppText>
                    <View style={styles.txMeta}>
                      <View style={[styles.txCategoryChip, { backgroundColor: color + "22" }]}>
                        <AppText style={[styles.txCategoryText, { color }]}>
                          {getExpenseCategoryLabel(expense.category)}
                        </AppText>
                      </View>
                      <AppText style={styles.txDate}>{formatDate(expense.date)}</AppText>
                    </View>
                    {expense.notes ? <AppText style={styles.txNotes} numberOfLines={1}>{expense.notes}</AppText> : null}
                  </View>
                  <View style={styles.txRight}>
                    <AppText style={styles.txAmountExpense}>-{expense.amount.toLocaleString("sr-RS")}</AppText>
                    <AppText style={styles.txCurrency}>KM</AppText>
                    <View style={styles.txActions}>
                      <TouchableOpacity onPress={() => openEditExpenseModal(expense)} style={styles.txActionBtn}>
                        <Ionicons name="create-outline" size={16} color={COLORS.primaryDark} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteExpense(expense.id)} style={styles.txActionBtn}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Bottom Action Row ─────────────────── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.addExpenseBtn} onPress={openAddExpenseModal} activeOpacity={0.85}>
          <Ionicons name="remove-circle-outline" size={18} color={COLORS.surface} />
          <AppText style={styles.addBtnText}>Dodaj trošak</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addIncomeBtn} onPress={openAddIncomeModal} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.surface} />
          <AppText style={styles.addBtnText}>Dodaj prihod</AppText>
        </TouchableOpacity>
      </View>

      {/* ── Modal ────────────────────────────── */}
      <Modal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); resetForm(); }}
        hasUnsavedChanges={formData.description !== "" || formData.amount !== ""}
        title={
          modalType === "expense"
            ? editingExpense ? "Izmeni Trošak" : "Dodaj Trošak"
            : editingIncome ? "Izmeni Prihod" : "Dodaj Prihod"
        }
      >
        <View style={styles.formSection}>
          <Picker
            label="Kategorija"
            value={formData.category}
            options={modalType === "expense" ? expenseCategoryOptions : incomeCategoryOptions}
            onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory | IncomeCategory })}
          />
        </View>

        <View style={styles.formSection}>
          <Input
            label="Opis"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Npr. Kupovina opreme..."
          />
        </View>

        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <Input
              label="Iznos (KM)"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.formHalf}>
            <Input
              label="Datum"
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Input
            label="Napomene (opciono)"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Dodatne informacije..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setModalVisible(false); resetForm(); }} variant="secondary" style={{ flex: 1 }} />
          <Button
            title={editingExpense || editingIncome ? "Sačuvaj" : "Dodaj"}
            onPress={handleSave}
            disabled={!formData.description || !formData.amount}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xxxl,
  },
  errorText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.danger,
    textAlign: "center",
  },

  // ── Profit Hero ────────────────────────────
  profitHero: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderTopWidth: 3,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.md,
  },
  profitHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 1.1,
  },
  profitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  profitChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  profitAmount: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  profitCurrency: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },

  // ── Split Row ──────────────────────────────
  splitRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  splitCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderTopWidth: 3,
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  splitEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 1.0,
    marginBottom: SPACING.xs,
  },
  splitAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  splitCurrency: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  splitCount: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // ── Section Label ──────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: SPACING.md,
    marginTop: SPACING.xxl,
  },

  // ── Generic Card ───────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOW.md,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  // ── Tab Toggle ─────────────────────────────
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.borderMedium,
    borderRadius: RADIUS.lg,
    padding: 3,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  tabBtnActive: {
    backgroundColor: COLORS.success,
    ...SHADOW.sm,
  },
  tabBtnActiveExpense: {
    backgroundColor: COLORS.danger,
    ...SHADOW.sm,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.surface,
  },
  tabBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    minWidth: 22,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeActiveExpense: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  tabBadgeTextActive: {
    color: COLORS.surface,
  },

  // ── Category Breakdown ─────────────────────
  categoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  catIconBox: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryMiddle: {
    flex: 1,
  },
  categoryName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  categoryBarTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  categoryAmount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    minWidth: 70,
    textAlign: "right",
  },

  // ── Transaction Card ───────────────────────
  txCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  txMiddle: {
    flex: 1,
    minWidth: 0,
  },
  txDescription: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  txMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  txCategoryChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  txCategoryText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  txDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  txNotes: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  txRight: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  txAmountIncome: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.success,
    letterSpacing: -0.3,
  },
  txAmountExpense: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.danger,
    letterSpacing: -0.3,
  },
  txCurrency: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  txActions: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  txActionBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bottom Action Row ──────────────────────
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  addExpenseBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  addIncomeBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  addBtnText: {
    color: COLORS.surface,
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ── Modal Form ─────────────────────────────
  formSection: {
    marginBottom: SPACING.lg,
  },
  formRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  formHalf: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: SPACING.xxl,
    gap: SPACING.md,
  },
});
