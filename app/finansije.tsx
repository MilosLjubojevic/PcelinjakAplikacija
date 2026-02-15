import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Picker, { PickerOption } from "../components/Picker";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";
import { useApp } from "../context/AppContext";
import { Expense, ExpenseCategory, Income, IncomeCategory, FinanceSummary } from "../types";
import { formatDate } from "../utils/dateUtils";

const expenseCategoryOptions: PickerOption[] = [
  { label: "Oprema", value: "equipment" },
  { label: "Hrana za pčele", value: "feed" },
  { label: "Lekovi", value: "medication" },
  { label: "Održavanje", value: "maintenance" },
  { label: "Transport", value: "transportation" },
  { label: "Pakovanje", value: "packaging" },
  { label: "Ostalo", value: "other" },
];

const incomeCategoryOptions: PickerOption[] = [
  { label: "Prodaja meda", value: "honey-sale" },
  { label: "Prodaja rojeva", value: "nucleus-sale" },
  { label: "Prodaja matica", value: "queen-sale" },
  { label: "Prodaja voska", value: "wax-sale" },
  { label: "Usluge oprašivanja", value: "pollination" },
  { label: "Ostalo", value: "other" },
];

const getExpenseCategoryLabel = (category: ExpenseCategory): string => {
  const option = expenseCategoryOptions.find((opt) => opt.value === category);
  return option ? option.label : category;
};

const getIncomeCategoryLabel = (category: IncomeCategory): string => {
  const option = incomeCategoryOptions.find((opt) => opt.value === category);
  return option ? option.label : category;
};

const getCategoryColor = (category: ExpenseCategory | IncomeCategory): string => {
  const colors: Record<string, string> = {
    equipment: COLORS.info,
    feed: COLORS.success,
    medication: COLORS.danger,
    maintenance: COLORS.accent.queen,
    transportation: COLORS.accent.nuclei,
    packaging: COLORS.primaryDark,
    "honey-sale": COLORS.primary,
    "nucleus-sale": COLORS.success,
    "queen-sale": COLORS.accent.nuclei,
    "wax-sale": COLORS.accent.queen,
    pollination: COLORS.info,
    other: COLORS.textSecondary,
  };
  return colors[category] || COLORS.textSecondary;
};

export default function FinansijeScreen() {
  const { state, loading, addExpense, updateExpense, deleteExpense, addIncome, updateIncome, deleteIncome } = useApp();
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
    setEditingExpense(null);
    setEditingIncome(null);
    setFormData({
      category: "equipment",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setModalVisible(true);
  };

  const openAddIncomeModal = () => {
    setModalType("income");
    setEditingExpense(null);
    setEditingIncome(null);
    setFormData({
      category: "honey-sale",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
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
        const newExpense: Expense = {
          id: Crypto.randomUUID(),
          ...expenseData,
          createdAt: now,
          updatedAt: now,
        };
        await addExpense(newExpense);
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
        const newIncome: Income = {
          id: Crypto.randomUUID(),
          ...incomeData,
          createdAt: now,
          updatedAt: now,
        };
        await addIncome(newIncome);
      }
    }

    setSaving(false);
    setModalVisible(false);
    resetForm();
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
  };

  const handleDeleteIncome = async (id: string) => {
    await deleteIncome(id);
  };

  // Calculate finance summary
  const calculateSummary = (): FinanceSummary => {
    const expenses = state.expenses || [];
    const incomes = state.incomes || [];

    const totalIncome = incomes.reduce(
      (sum, income) => sum + income.amount,
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    const expensesByCategory = expenses.reduce(
      (acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      },
      {} as Record<ExpenseCategory, number>
    );

    const incomeByCategory = incomes.reduce(
      (acc, income) => {
        acc[income.category] = (acc[income.category] || 0) + income.amount;
        return acc;
      },
      {} as Record<IncomeCategory, number>
    );

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      expensesByCategory,
      incomeByCategory,
    };
  };

  const summary = calculateSummary();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Učitavanje...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="trending-up" size={24} color={COLORS.success} />
          </View>
          <Text style={styles.summaryLabel}>Prihodi</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.success }]}>
            {summary.totalIncome.toLocaleString("sr-RS")} KM
          </Text>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="trending-down" size={24} color={COLORS.danger} />
          </View>
          <Text style={styles.summaryLabel}>Troškovi</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.danger }]}>
            {summary.totalExpenses.toLocaleString("sr-RS")} KM
          </Text>
        </Card>

        <Card
          style={[
            styles.summaryCard,
            styles.profitCard,
            summary.netProfit < 0 ? styles.lossCard : undefined,
          ]}
        >
          <View style={styles.summaryIconContainer}>
            <Ionicons
              name={summary.netProfit >= 0 ? "cash" : "alert-circle"}
              size={24}
              color={COLORS.surface}
            />
          </View>
          <Text style={styles.profitLabel}>
            {summary.netProfit >= 0 ? "Profit" : "Gubitak"}
          </Text>
          <Text style={styles.profitAmount}>
            {Math.abs(summary.netProfit).toLocaleString("sr-RS")} KM
          </Text>
        </Card>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Income by Category */}
        {Object.keys(summary.incomeByCategory).length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart" size={20} color={COLORS.primaryDark} />
              <Text style={styles.sectionTitle}>Prihodi po Kategorijama</Text>
            </View>
            <Card style={styles.categoryCard}>
              {(Object.entries(summary.incomeByCategory) as [IncomeCategory, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount], index, arr) => (
                  <View
                    key={category}
                    style={[
                      styles.categoryRow,
                      index === arr.length - 1 && styles.categoryRowLast
                    ]}
                  >
                    <View style={styles.categoryLeft}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: getCategoryColor(category) },
                        ]}
                      />
                      <Text style={styles.categoryName}>
                        {getIncomeCategoryLabel(category)}
                      </Text>
                    </View>
                    <Text style={[styles.categoryAmount, { color: COLORS.success }]}>
                      {amount.toLocaleString("sr-RS")} KM
                    </Text>
                  </View>
                ))}
            </Card>
          </View>
        )}

        {/* Income List */}
        <View style={styles.listHeader}>
          <View style={styles.sectionHeader}>
            <Ionicons name="arrow-up-circle" size={20} color={COLORS.success} />
            <Text style={styles.sectionTitle}>Prihodi</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {(state.incomes || []).length}
            </Text>
          </View>
        </View>

        {(state.incomes || []).length === 0 ? (
          <View style={styles.emptySection}>
            <EmptyState
              icon="trending-up-outline"
              title="Nema prihoda"
              message="Dodajte prihode da biste pratili finansije."
            />
          </View>
        ) : (
          (state.incomes || [])
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .map((income) => (
              <Card key={income.id} style={[styles.itemCard, { borderLeftColor: COLORS.success }]}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(income.category) },
                      ]}
                    >
                      <Text style={styles.categoryBadgeText}>
                        {getIncomeCategoryLabel(income.category)}
                      </Text>
                    </View>
                    <Text style={styles.itemDescription}>
                      {income.description}
                    </Text>
                  </View>
                  <Text style={styles.incomeAmount}>
                    +{income.amount.toLocaleString("sr-RS")} KM
                  </Text>
                </View>

                <View style={styles.itemFooter}>
                  <Text style={styles.itemDate}>
                    {formatDate(income.date)}
                  </Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => openEditIncomeModal(income)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="create-outline" size={20} color={COLORS.primaryDark} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteIncome(income.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {income.notes && (
                  <Text style={styles.itemNotes}>{income.notes}</Text>
                )}
              </Card>
            ))
        )}

        {/* Divider */}
        {(state.incomes || []).length > 0 && (state.expenses || []).length > 0 && (
          <View style={styles.divider} />
        )}

        {/* Expenses by Category */}
        {Object.keys(summary.expensesByCategory).length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart" size={20} color={COLORS.primaryDark} />
              <Text style={styles.sectionTitle}>Troškovi po Kategorijama</Text>
            </View>
            <Card style={styles.categoryCard}>
              {(Object.entries(summary.expensesByCategory) as [ExpenseCategory, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount], index, arr) => (
                  <View
                    key={category}
                    style={[
                      styles.categoryRow,
                      index === arr.length - 1 && styles.categoryRowLast
                    ]}
                  >
                    <View style={styles.categoryLeft}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: getCategoryColor(category) },
                        ]}
                      />
                      <Text style={styles.categoryName}>
                        {getExpenseCategoryLabel(category)}
                      </Text>
                    </View>
                    <Text style={styles.categoryAmount}>
                      {amount.toLocaleString("sr-RS")} KM
                    </Text>
                  </View>
                ))}
            </Card>
          </View>
        )}

        {/* Expenses List */}
        <View style={styles.listHeader}>
          <View style={styles.sectionHeader}>
            <Ionicons name="arrow-down-circle" size={20} color={COLORS.danger} />
            <Text style={styles.sectionTitle}>Troškovi</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {(state.expenses || []).length}
            </Text>
          </View>
        </View>

        {(state.expenses || []).length === 0 ? (
          <View style={styles.emptySection}>
            <EmptyState
              icon="wallet-outline"
              title="Nema troškova"
              message="Dodajte troškove da biste pratili finansije."
            />
          </View>
        ) : (
          (state.expenses || [])
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .map((expense) => (
              <Card key={expense.id} style={[styles.itemCard, { borderLeftColor: COLORS.danger }]}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(expense.category) },
                      ]}
                    >
                      <Text style={styles.categoryBadgeText}>
                        {getExpenseCategoryLabel(expense.category)}
                      </Text>
                    </View>
                    <Text style={styles.itemDescription}>
                      {expense.description}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>
                    -{expense.amount.toLocaleString("sr-RS")} KM
                  </Text>
                </View>

                <View style={styles.itemFooter}>
                  <Text style={styles.itemDate}>
                    {formatDate(expense.date)}
                  </Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      onPress={() => openEditExpenseModal(expense)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="create-outline" size={20} color={COLORS.primaryDark} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(expense.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {expense.notes && (
                  <Text style={styles.itemNotes}>{expense.notes}</Text>
                )}
              </Card>
            ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.addExpenseButton} onPress={openAddExpenseModal}>
          <Ionicons name="remove" size={20} color={COLORS.surface} />
          <Text style={styles.addButtonText}>Trošak</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addIncomeButton} onPress={openAddIncomeModal}>
          <Ionicons name="add" size={20} color={COLORS.surface} />
          <Text style={styles.addButtonText}>Prihod</Text>
        </TouchableOpacity>
      </View>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        title={
          modalType === "expense"
            ? editingExpense
              ? "Izmeni Trošak"
              : "Dodaj Trošak"
            : editingIncome
            ? "Izmeni Prihod"
            : "Dodaj Prihod"
        }
      >
        <View style={styles.formSection}>
          <Picker
            label="Kategorija"
            value={formData.category}
            options={modalType === "expense" ? expenseCategoryOptions : incomeCategoryOptions}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                category: value as ExpenseCategory | IncomeCategory,
              })
            }
          />
        </View>

        <View style={styles.formSection}>
          <Input
            label="Opis"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
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
              placeholder="DD/MM/YYYY"
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
          <Button
            title="Otkaži"
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
            variant="secondary"
            style={{ flex: 1 }}
          />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  summaryIconContainer: {
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    fontWeight: "500",
  },
  summaryAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
  },
  profitCard: {
    backgroundColor: COLORS.success,
  },
  lossCard: {
    backgroundColor: COLORS.danger,
  },
  profitLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.surface,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    fontWeight: "500",
  },
  profitAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "bold",
    color: COLORS.surface,
  },
  categorySection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  categoryCard: {
    overflow: "hidden",
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xxl,
    borderRadius: 1,
    opacity: 0.3,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMedium,
  },
  categoryRowLast: {
    borderBottomWidth: 0,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  categoryDot: {
    width: SPACING.md,
    height: SPACING.md,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    minWidth: 32,
    alignItems: "center",
  },
  countBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  emptySection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  itemCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  itemLeft: {
    flex: 1,
    gap: SPACING.sm,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    ...SHADOW.sm,
  },
  categoryBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.surface,
    letterSpacing: 0.3,
  },
  itemDescription: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  incomeAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.success,
    letterSpacing: 0.2,
  },
  expenseAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: "800",
    color: COLORS.danger,
    letterSpacing: 0.2,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  itemDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  itemActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
  },
  itemNotes: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontStyle: "italic",
    lineHeight: 18,
  },
  fabContainer: {
    position: "absolute",
    bottom: SPACING.xxl,
    right: SPACING.lg,
    flexDirection: "row",
    gap: SPACING.md,
  },
  addIncomeButton: {
    height: 52,
    paddingHorizontal: SPACING.lg,
    borderRadius: 28,
    backgroundColor: COLORS.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    ...SHADOW.fab,
  },
  addExpenseButton: {
    height: 52,
    paddingHorizontal: SPACING.lg,
    borderRadius: 28,
    backgroundColor: COLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    ...SHADOW.fab,
  },
  addButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
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
