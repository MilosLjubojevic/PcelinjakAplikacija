import { StyleSheet } from "react-native";

// ─── Colors ─────────────────────────────────────────────────────
export const COLORS = {
  primary: "#F5A623",
  primaryDark: "#8B6914",
  background: "#FAF8F3",
  surface: "#FFFFFF",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#F3F0EB",
  borderMedium: "#E8E5E0",
  success: "#22C55E",
  successLight: "#DCFCE7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#DBEAFE",
  accent: {
    hive: "#F59E0B",
    hiveLight: "#FEF3C7",
    queen: "#F97316",
    queenLight: "#FFEDD5",
    nuclei: "#8B5CF6",
    nucleiLight: "#EDE9FE",
    sale: "#22C55E",
    saleLight: "#DCFCE7",
    finance: "#6366F1",
    financeLight: "#E0E7FF",
  },
} as const;

// ─── Spacing ────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ─── Border Radius ──────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ─── Font Sizes ─────────────────────────────────────────────────
export const FONT_SIZE = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 28,
} as const;

// ─── Shared Shadows ─────────────────────────────────────────────
export const SHADOW = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

// ─── Common Styles ──────────────────────────────────────────────
export const commonStyles = StyleSheet.create({
  screen: {
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xxxl,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.danger,
    textAlign: "center",
    marginVertical: SPACING.lg,
  },
  fab: {
    position: "absolute",
    bottom: SPACING.xxl,
    right: SPACING.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.fab,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
});
