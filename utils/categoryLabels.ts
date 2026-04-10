import { COLORS } from '../constants/designTokens';
import { ExpenseCategory, IncomeCategory } from '../types';
import { PickerOption } from '../components/Picker';

// ─── Expense Categories ────────────────────────────────────────

export const expenseCategoryOptions: PickerOption[] = [
  { label: "Oprema", value: "equipment" },
  { label: "Hrana za pčele", value: "feed" },
  { label: "Lijekovi", value: "medication" },
  { label: "Održavanje", value: "maintenance" },
  { label: "Transport", value: "transportation" },
  { label: "Pakovanje", value: "packaging" },
  { label: "Ostalo", value: "other" },
];

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  equipment: "Oprema",
  feed: "Hrana",
  medication: "Lijekovi",
  maintenance: "Održavanje",
  transportation: "Transport",
  packaging: "Pakovanje",
  other: "Ostalo",
};

// ─── Income Categories ─────────────────────────────────────────

export const incomeCategoryOptions: PickerOption[] = [
  { label: "Prodaja meda", value: "honey-sale" },
  { label: "Prodaja rojeva", value: "nucleus-sale" },
  { label: "Prodaja matica", value: "queen-sale" },
  { label: "Prodaja košnica", value: "hive-sale" },
  { label: "Prodaja voska", value: "wax-sale" },
  { label: "Usluge oprašivanja", value: "pollination" },
  { label: "Ostalo", value: "other" },
];

export const incomeCategoryLabels: Record<IncomeCategory, string> = {
  "honey-sale": "Med",
  "nucleus-sale": "Rojevi",
  "queen-sale": "Matice",
  "hive-sale": "Košnice",
  "wax-sale": "Vosak",
  pollination: "Oprašivanje",
  other: "Ostalo",
};

// ─── Category Colors ───────────────────────────────────────────

export const categoryColors: Record<string, string> = {
  equipment: COLORS.info,
  feed: COLORS.success,
  medication: COLORS.danger,
  maintenance: COLORS.accent.queen,
  transportation: COLORS.accent.swarm,
  packaging: COLORS.primaryDark,
  "honey-sale": COLORS.primary,
  "nucleus-sale": COLORS.success,
  "queen-sale": COLORS.accent.swarm,
  "hive-sale": COLORS.primaryDark,
  "wax-sale": COLORS.accent.queen,
  pollination: COLORS.info,
  other: COLORS.textSecondary,
};

// ─── Helpers ───────────────────────────────────────────────────

export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  return expenseCategoryLabels[category] || category;
}

export function getIncomeCategoryLabel(category: IncomeCategory): string {
  return incomeCategoryLabels[category] || category;
}

export function getCategoryColor(category: ExpenseCategory | IncomeCategory): string {
  return categoryColors[category] || COLORS.textSecondary;
}
