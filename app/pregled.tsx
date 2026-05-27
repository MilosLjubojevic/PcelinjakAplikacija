import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AppText from "../components/AppText";
import HiveEditModals from "../components/HiveEditModals";
import {
  COLORS,
  FONT_SIZE,
  RADIUS,
  SHADOW,
  SPACING,
} from "../constants/designTokens";
import { useApp } from "../context/AppContext";
import { useHiveEditModal } from "../hooks/useHiveEditModal";
import { Hive, HiveHealth, Location } from "../types";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const HEALTH_COLOR: Record<HiveHealth, string> = {
  good: COLORS.success,
  warning: COLORS.primary,
  bad: COLORS.danger,
};

const HEALTH_LABEL: Record<HiveHealth, string> = {
  good: "Dobra",
  warning: "Upozorenje",
  bad: "Loša",
};

interface InspectionItem {
  hive: Hive;
  location: Location;
  rowName: string;
}

export default function PregledScreen() {
  const { state, updateLocation } = useApp();
  const modal = useHiveEditModal();

  const [postponingHiveId, setPostponingHiveId] = useState<string | null>(null);

  const today = new Date();

  const items: InspectionItem[] = [];
  for (const location of state.locations) {
    for (const row of location.rows) {
      for (const hive of row.hives) {
        if (
          hive.scheduledInspection &&
          isSameDay(new Date(hive.scheduledInspection), today)
        ) {
          items.push({ hive, location, rowName: row.name });
        }
      }
    }
  }

  const markDone = async (item: InspectionItem) => {
    const updatedHive: Hive = {
      ...item.hive,
      lastInspection: new Date(),
      scheduledInspection: undefined,
      updatedAt: new Date(),
    };
    await updateLocation(item.location.id, {
      rows: item.location.rows.map((row) => ({
        ...row,
        hives: row.hives.map((h) => (h.id === item.hive.id ? updatedHive : h)),
      })),
    });
  };

  const postpone = async (item: InspectionItem, days: number) => {
    const base = item.hive.scheduledInspection
      ? new Date(item.hive.scheduledInspection)
      : new Date();
    const newDate = new Date(base);
    newDate.setDate(newDate.getDate() + days);
    const updatedHive: Hive = {
      ...item.hive,
      scheduledInspection: newDate,
      updatedAt: new Date(),
    };
    await updateLocation(item.location.id, {
      rows: item.location.rows.map((row) => ({
        ...row,
        hives: row.hives.map((h) => (h.id === item.hive.id ? updatedHive : h)),
      })),
    });
    setPostponingHiveId(null);
  };

  const todayStr = today.toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
        <AppText style={styles.dateText}>{todayStr}</AppText>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
          </View>
          <AppText style={styles.emptyTitle}>Nema pregleda za danas</AppText>
          <AppText style={styles.emptySubtitle}>
            Nijedna košnica nije zakazana za pregled danas.
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.summaryBanner}>
            <Ionicons name="search" size={16} color={COLORS.accent.hive} />
            <AppText style={styles.summaryText}>
              <AppText style={styles.summaryBold}>{items.length}</AppText>{" "}
              {items.length === 1 ? "košnica zakazana" : "košnica zakazano"} za pregled
            </AppText>
          </View>

          {items.map((item) => {
            const isPostponing = postponingHiveId === item.hive.id;
            return (
              <View key={item.hive.id} style={styles.card}>
                {/* ── Hive info row ── */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.7}
                  onPress={() => modal.openEditHiveModal(item.hive)}
                >
                  <View
                    style={[
                      styles.hiveIconBox,
                      { backgroundColor: COLORS.accent.hiveLight },
                    ]}
                  >
                    <Ionicons
                      name={item.hive.type === "swarm" ? "cube" : "grid"}
                      size={20}
                      color={COLORS.accent.hive}
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <AppText style={styles.hiveNumber}>
                      {item.hive.type === "swarm" ? "Roj" : "Košnica"} br.{" "}
                      <AppText style={styles.hiveNumberBold}>{item.hive.number}</AppText>
                    </AppText>
                    <AppText style={styles.metaText}>
                      <AppText style={styles.metaLabel}>Lokacija: </AppText>
                      {item.location.name}
                      {"  ·  "}
                      <AppText style={styles.metaLabel}>Red: </AppText>
                      {item.rowName}
                    </AppText>
                  </View>
                  <View style={styles.cardRight}>
                    <View
                      style={[
                        styles.healthChip,
                        { backgroundColor: HEALTH_COLOR[item.hive.health] + "22" },
                      ]}
                    >
                      <View
                        style={[
                          styles.healthDot,
                          { backgroundColor: HEALTH_COLOR[item.hive.health] },
                        ]}
                      />
                      <AppText
                        style={[
                          styles.healthLabel,
                          { color: HEALTH_COLOR[item.hive.health] },
                        ]}
                      >
                        {HEALTH_LABEL[item.hive.health]}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>

                {/* ── Last note ── */}
                {item.hive.notes && item.hive.notes.length > 0 && (() => {
                  const last = [...item.hive.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                  return (
                    <View style={styles.notePreview}>
                      <Ionicons name="document-text-outline" size={13} color={COLORS.textMuted} style={{ marginTop: 1 }} />
                      <View style={styles.notePreviewBody}>
                        <AppText style={styles.notePreviewText} numberOfLines={2}>{last.text}</AppText>
                        <AppText style={styles.notePreviewDate}>{new Date(last.createdAt).toLocaleDateString("sr-Latn-BA", { day: "2-digit", month: "short", year: "numeric" })}</AppText>
                      </View>
                    </View>
                  );
                })()}

                {/* ── Action row ── */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnDone]}
                    onPress={() => markDone(item)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
                    <AppText style={[styles.actionBtnText, { color: COLORS.success }]}>Pregledano</AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPostpone, isPostponing && styles.actionBtnPostponeActive]}
                    onPress={() => setPostponingHiveId(isPostponing ? null : item.hive.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="time-outline" size={15} color={COLORS.primary} />
                    <AppText style={[styles.actionBtnText, { color: COLORS.primary }]}>Odgodi</AppText>
                    <Ionicons
                      name={isPostponing ? "chevron-up" : "chevron-down"}
                      size={13}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>

                {/* ── Postpone day picker ── */}
                {isPostponing && (
                  <View style={styles.postponeRow}>
                    {[1, 3, 7].map((days) => (
                      <TouchableOpacity
                        key={days}
                        style={styles.dayBtn}
                        onPress={() => postpone(item, days)}
                        activeOpacity={0.75}
                      >
                        <AppText style={styles.dayBtnText}>+{days}d</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      <View style={{ height: SPACING.xxxl }} />

      <HiveEditModals
        editingHive={modal.editingHive}
        hiveFormData={modal.hiveFormData}
        setHiveFormData={modal.setHiveFormData}
        swarmFormData={modal.swarmFormData}
        setSwarmFormData={modal.setSwarmFormData}
        editHiveModalVisible={modal.editHiveModalVisible}
        setEditHiveModalVisible={modal.setEditHiveModalVisible}
        editSwarmModalVisible={modal.editSwarmModalVisible}
        setEditSwarmModalVisible={modal.setEditSwarmModalVisible}
        saving={modal.saving}
        handleSaveHive={modal.handleSaveHive}
        handleSaveSwarm={modal.handleSaveSwarm}
        handleSwitchToSwarm={modal.handleSwitchToSwarm}
        handleSwitchToHive={modal.handleSwitchToHive}
        handleAddNote={modal.handleAddNote}
        handleDeleteNote={modal.handleDeleteNote}
        resetHiveForm={modal.resetHiveForm}
        resetSwarmForm={modal.resetSwarmForm}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.xl,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  dateText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },

  // ── Empty state ───────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    paddingTop: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Summary banner ────────────────────────────────────────
  summaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.accent.hiveLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.accent.hive,
  },
  summaryBold: {
    fontWeight: "700",
  },

  // ── Card ─────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: "hidden",
    ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  hiveIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: SPACING.xs,
  },
  hiveNumber: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  hiveNumberBold: {
    fontWeight: "700",
  },
  metaText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  metaLabel: {
    color: COLORS.textMuted,
  },
  healthChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  healthDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Last note preview ─────────────────────────────────────
  notePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  notePreviewBody: { flex: 1, gap: 2 },
  notePreviewText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  notePreviewDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // ── Action row ────────────────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: SPACING.md,
  },
  actionBtnDone: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.successLight,
  },
  actionBtnPostpone: {
    backgroundColor: COLORS.surface,
  },
  actionBtnPostponeActive: {
    backgroundColor: COLORS.accent.hiveLight,
  },
  actionBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
  },

  // ── Postpone day picker ───────────────────────────────────
  postponeRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  dayBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  dayBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "700",
    color: COLORS.primary,
  },
});
