import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import AppText from "./AppText";
import Button from "./Button";
import DatePicker from "./DatePicker";
import Input from "./Input";
import Modal from "./Modal";
import Picker from "./Picker";
import { COLORS, FONT_SIZE, RADIUS, SHADOW, SPACING } from "../constants/designTokens";
import { HiveFormData, SwarmFormData } from "../hooks/useHiveEditModal";
import { Hive, HiveHealth, SwarmStatus } from "../types";
import { formatDate } from "../utils/dateUtils";

interface Props {
  // State
  editingHive: Hive | null;
  hiveFormData: HiveFormData;
  setHiveFormData: (data: HiveFormData) => void;
  swarmFormData: SwarmFormData;
  setSwarmFormData: (data: SwarmFormData) => void;
  editHiveModalVisible: boolean;
  setEditHiveModalVisible: (v: boolean) => void;
  editSwarmModalVisible: boolean;
  setEditSwarmModalVisible: (v: boolean) => void;
  saving: boolean;
  // Handlers
  handleSaveHive: () => Promise<void>;
  handleSaveSwarm: () => Promise<void>;
  handleSwitchToSwarm: () => Promise<void>;
  handleSwitchToHive: () => Promise<void>;
  handleAddNote: () => void;
  handleDeleteNote: (noteId: string) => void;
  resetHiveForm: () => void;
  resetSwarmForm: () => void;
  // Optional
  onDelete?: () => void;
}

export default function HiveEditModals({
  editingHive,
  hiveFormData, setHiveFormData,
  swarmFormData, setSwarmFormData,
  editHiveModalVisible, setEditHiveModalVisible,
  editSwarmModalVisible, setEditSwarmModalVisible,
  saving,
  handleSaveHive, handleSaveSwarm,
  handleSwitchToSwarm, handleSwitchToHive,
  handleAddNote, handleDeleteNote,
  resetHiveForm, resetSwarmForm,
  onDelete,
}: Props) {
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const confirmDeleteNote = (noteId: string) => {
    Alert.alert(
      "Obriši bilješku",
      "Da li si siguran/a da želiš obrisati ovu bilješku?",
      [
        { text: "Odustani", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: () => {
            setDeletingNoteId(noteId);
            handleDeleteNote(noteId);
            setDeletingNoteId(null);
          },
        },
      ],
    );
  };

  return (
    <>
      {/* ─── Edit Hive Modal ─────────────────────────────────── */}
      <Modal
        visible={editHiveModalVisible}
        onClose={() => { setEditHiveModalVisible(false); resetHiveForm(); }}
        title={`Košnica ${editingHive?.number || ""}`}
        hasUnsavedChanges={hiveFormData.newNote.trim() !== "" || hiveFormData.inspectionNote.trim() !== ""}
      >
        <View style={styles.typeSwitcherContainer}>
          <TouchableOpacity style={[styles.typeSwitcherOption, styles.typeSwitcherOptionActive, { borderColor: COLORS.accent.hive }]}>
            <Ionicons name="grid-outline" size={18} color={COLORS.accent.hive} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.accent.hive }]}>Košnica</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.typeSwitcherOption} onPress={handleSwitchToSwarm}>
            <Ionicons name="cube-outline" size={18} color={COLORS.textMuted} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.textMuted }]}>Roj</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <AppText style={styles.sectionTitle}>Opšte informacije</AppText>
          <Input
            label="Broj košnice"
            value={hiveFormData.hiveNumber}
            onChangeText={(text) => setHiveFormData({ ...hiveFormData, hiveNumber: text })}
            placeholder="Npr. 1, 2, 3..."
            keyboardType="numeric"
          />
          <Picker
            label="Zdravlje košnice"
            value={hiveFormData.health}
            options={[{ label: "Dobro", value: "good" }, { label: "Loše", value: "bad" }]}
            onValueChange={(value) => setHiveFormData({ ...hiveFormData, health: value as HiveHealth })}
          />
        </View>

        <View style={styles.sectionContainer}>
          <AppText style={styles.sectionTitle}>Održavanje</AppText>
          <View style={styles.feedingSection}>
            <AppText style={styles.feedingLabel}>Prihrane ({hiveFormData.feedingDates.length})</AppText>
            <DatePicker
              label="Dodaj novu prihranu"
              value={null}
              onChange={(date) => {
                if (date) setHiveFormData({ ...hiveFormData, feedingDates: [...hiveFormData.feedingDates, date].sort((a, b) => b.getTime() - a.getTime()) });
              }}
            />
            {hiveFormData.feedingDates.length > 0 && (
              <View style={styles.feedingList}>
                {hiveFormData.feedingDates.map((date, index) => (
                  <View key={index} style={styles.feedingItem}>
                    <AppText style={styles.feedingDate}>{formatDate(date)}</AppText>
                    <TouchableOpacity
                      onPress={() => setHiveFormData({ ...hiveFormData, feedingDates: hiveFormData.feedingDates.filter((_, i) => i !== index) })}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="close-circle" size={SPACING.xl} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
          <DatePicker
            label="Datum posljednje inspekcije"
            value={hiveFormData.lastInspection}
            onChange={(date) => setHiveFormData({ ...hiveFormData, lastInspection: date, inspectionNote: "" })}
          />
          {hiveFormData.lastInspection && (() => {
            const lastNote = editingHive?.notes && editingHive.notes.length > 0
              ? [...editingHive.notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
              : null;
            return (
              <>
                {lastNote && (
                  <View style={styles.lastNotePreview}>
                    <AppText style={styles.lastNoteLabel}>Posljednja bilješka</AppText>
                    <AppText style={styles.lastNoteText}>{lastNote.text}</AppText>
                    <AppText style={styles.lastNoteDate}>{formatDate(lastNote.createdAt)}</AppText>
                  </View>
                )}
                <Input
                  label="Bilješka inspekcije"
                  value={hiveFormData.inspectionNote}
                  onChangeText={(text) => setHiveFormData({ ...hiveFormData, inspectionNote: text })}
                  placeholder="Šta ste uočili tokom inspekcije..."
                  multiline
                  numberOfLines={3}
                />
              </>
            );
          })()}
          <View style={styles.scheduledRow}>
            <View style={styles.scheduledInfo}>
              <Ionicons name="calendar" size={16} color="#835500" />
              <AppText style={styles.scheduledLabel}>Zakazana inspekcija</AppText>
            </View>
            {hiveFormData.scheduledInspection && (
              <View style={styles.scheduledChip}>
                <AppText style={styles.scheduledChipText}>
                  {hiveFormData.scheduledInspection.toLocaleDateString("sr-Latn-BA", { day: "2-digit", month: "short", year: "numeric" })}
                </AppText>
                <TouchableOpacity onPress={() => setHiveFormData({ ...hiveFormData, scheduledInspection: null })}>
                  <Ionicons name="close-circle" size={16} color="#835500" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <DatePicker
            label="Zakaži inspekciju"
            value={hiveFormData.scheduledInspection}
            onChange={(date) => setHiveFormData({ ...hiveFormData, scheduledInspection: date })}
            placeholder="Odaberi datum inspekcije..."
          />
        </View>

        <View style={styles.notesSection}>
          <AppText style={styles.notesLabel}>Bilješke</AppText>
          {editingHive?.notes && editingHive.notes.length > 0 && (
            <View style={styles.notesList}>
              {editingHive.notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteContent}>
                    <AppText style={styles.noteText}>{note.text}</AppText>
                    <AppText style={styles.noteDate}>{formatDate(note.createdAt)}</AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDeleteNote(note.id)}
                    style={styles.deleteButton}
                    disabled={deletingNoteId === note.id}
                  >
                    {deletingNoteId === note.id ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={SPACING.xl} color={COLORS.danger} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.addNoteRow}>
            <Input
              value={hiveFormData.newNote}
              onChangeText={(text) => setHiveFormData({ ...hiveFormData, newNote: text })}
              placeholder="Dodaj novu bilješku..."
              multiline
              numberOfLines={3}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button title="Dodaj" onPress={handleAddNote} disabled={!hiveFormData.newNote.trim()} style={styles.addNoteBtn} />
          </View>
        </View>

        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setEditHiveModalVisible(false); resetHiveForm(); }} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button title="Sačuvaj" onPress={handleSaveHive} loading={saving} style={{ flex: 1, marginLeft: SPACING.sm }} />
        </View>

        {onDelete && (
          <TouchableOpacity style={styles.deleteHiveBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <AppText style={styles.deleteHiveBtnText}>Obriši košnicu</AppText>
          </TouchableOpacity>
        )}
      </Modal>

      {/* ─── Edit Swarm Modal ─────────────────────────────────── */}
      <Modal
        visible={editSwarmModalVisible}
        onClose={() => { setEditSwarmModalVisible(false); resetSwarmForm(); }}
        title={`Roj ${editingHive?.number || ""}`}
        hasUnsavedChanges={swarmFormData.newNote.trim() !== ""}
      >
        <View style={styles.typeSwitcherContainer}>
          <TouchableOpacity style={styles.typeSwitcherOption} onPress={handleSwitchToHive}>
            <Ionicons name="grid-outline" size={18} color={COLORS.textMuted} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.textMuted }]}>Košnica</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeSwitcherOption, styles.typeSwitcherOptionActive, { borderColor: COLORS.accent.swarm }]}>
            <Ionicons name="cube-outline" size={18} color={COLORS.accent.swarm} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.accent.swarm }]}>Roj</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Picker
            label="Zdravlje"
            value={swarmFormData.health}
            options={[{ label: "Dobro", value: "good" }, { label: "Upozorenje", value: "warning" }]}
            onValueChange={(value) => setSwarmFormData({ ...swarmFormData, health: value as HiveHealth })}
          />
          <Picker
            label="Status roja"
            value={swarmFormData.swarmStatus}
            options={[{ label: "Prazan", value: "empty" }, { label: "Razvija se", value: "developing" }, { label: "Spreman", value: "ready" }, { label: "Prirodni", value: "natural" }]}
            onValueChange={(value) => setSwarmFormData({ ...swarmFormData, swarmStatus: value as SwarmStatus })}
          />
          <DatePicker
            label="Datum početka razvoja"
            value={swarmFormData.swarmStartDate}
            onChange={(date) => setSwarmFormData({ ...swarmFormData, swarmStartDate: date })}
          />
          <View style={styles.scheduledRow}>
            <View style={styles.scheduledInfo}>
              <Ionicons name="calendar" size={16} color="#835500" />
              <AppText style={styles.scheduledLabel}>Zakazana inspekcija</AppText>
            </View>
            {swarmFormData.scheduledInspection && (
              <View style={styles.scheduledChip}>
                <AppText style={styles.scheduledChipText}>
                  {swarmFormData.scheduledInspection.toLocaleDateString("sr-Latn-BA", { day: "2-digit", month: "short", year: "numeric" })}
                </AppText>
                <TouchableOpacity onPress={() => setSwarmFormData({ ...swarmFormData, scheduledInspection: null })}>
                  <Ionicons name="close-circle" size={16} color="#835500" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <DatePicker
            label="Zakaži inspekciju"
            value={swarmFormData.scheduledInspection}
            onChange={(date) => setSwarmFormData({ ...swarmFormData, scheduledInspection: date })}
            placeholder="Odaberi datum inspekcije..."
          />
          <View style={styles.switchRow}>
            <AppText style={styles.switchLabel}>Aktivan</AppText>
            <TouchableOpacity
              style={[styles.switch, swarmFormData.isActive && styles.switchActive]}
              onPress={() => setSwarmFormData({ ...swarmFormData, isActive: !swarmFormData.isActive })}
            >
              <View style={[styles.switchThumb, swarmFormData.isActive && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.notesSection}>
          <AppText style={styles.notesLabel}>Bilješke</AppText>
          {editingHive?.notes && editingHive.notes.length > 0 && (
            <View style={styles.notesList}>
              {editingHive.notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteContent}>
                    <AppText style={styles.noteText}>{note.text}</AppText>
                    <AppText style={styles.noteDate}>{formatDate(note.createdAt)}</AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDeleteNote(note.id)}
                    style={styles.deleteButton}
                    disabled={deletingNoteId === note.id}
                  >
                    {deletingNoteId === note.id ? (
                      <ActivityIndicator size="small" color={COLORS.danger} />
                    ) : (
                      <Ionicons name="trash-outline" size={SPACING.xl} color={COLORS.danger} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.addNoteRow}>
            <Input
              value={swarmFormData.newNote}
              onChangeText={(text) => setSwarmFormData({ ...swarmFormData, newNote: text })}
              placeholder="Dodaj novu bilješku..."
              multiline
              numberOfLines={3}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button title="Dodaj" onPress={handleAddNote} disabled={!swarmFormData.newNote.trim()} style={styles.addNoteBtn} />
          </View>
        </View>

        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setEditSwarmModalVisible(false); resetSwarmForm(); }} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button title="Sačuvaj" onPress={handleSaveSwarm} loading={saving} style={{ flex: 1, marginLeft: SPACING.sm }} />
        </View>

        {onDelete && (
          <TouchableOpacity style={styles.deleteHiveBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <AppText style={styles.deleteHiveBtnText}>Obriši roj</AppText>
          </TouchableOpacity>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  typeSwitcherContainer: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg },
  typeSwitcherOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.background,
  },
  typeSwitcherOptionActive: { backgroundColor: COLORS.surface },
  typeSwitcherLabel: { fontSize: FONT_SIZE.md, fontWeight: "600" },

  sectionContainer: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderMedium,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: "#835500",
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderMedium,
  },

  feedingSection: { marginBottom: SPACING.md },
  feedingLabel: { fontSize: FONT_SIZE.sm, fontWeight: "600", color: COLORS.textSecondary, marginBottom: SPACING.sm },
  feedingList: { marginTop: SPACING.sm, gap: SPACING.sm },
  feedingItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderMedium,
  },
  feedingDate: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary },
  deleteButton: { padding: SPACING.xs },

  scheduledRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm },
  scheduledInfo: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  scheduledLabel: { fontSize: FONT_SIZE.sm, fontWeight: "600", color: "#835500" },
  scheduledChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FEF3C7", paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: "#D97706",
  },
  scheduledChipText: { fontSize: FONT_SIZE.xs, fontWeight: "600", color: "#835500" },

  notesSection: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderMedium,
  },
  notesLabel: {
    fontSize: 11, fontWeight: "700", color: "#835500",
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderMedium,
  },
  notesList: { marginBottom: SPACING.md },
  noteItem: {
    flexDirection: "row", backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderMedium,
  },
  noteContent: { flex: 1, marginRight: SPACING.sm },
  noteText: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  noteDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  lastNotePreview: {
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderMedium,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  lastNoteLabel: { fontSize: FONT_SIZE.xs, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: SPACING.xs },
  lastNoteText: { fontSize: FONT_SIZE.md, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  lastNoteDate: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },

  addNoteRow: { gap: SPACING.sm },
  addNoteBtn: { marginTop: SPACING.sm },

  switchRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    minHeight: 48, paddingVertical: SPACING.xs, marginBottom: SPACING.xs,
  },
  switchLabel: { fontSize: FONT_SIZE.md, fontWeight: "500", color: COLORS.textPrimary },
  switch: { width: 52, height: 30, borderRadius: 15, backgroundColor: COLORS.borderMedium, padding: 2, justifyContent: "center" },
  switchActive: { backgroundColor: COLORS.primary },
  switchThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.surface, ...SHADOW.sm },
  switchThumbActive: { transform: [{ translateX: 22 }] },

  modalButtons: { flexDirection: "row", marginTop: SPACING.sm },
  deleteHiveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, marginTop: SPACING.lg, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.danger,
  },
  deleteHiveBtnText: { fontSize: FONT_SIZE.md, fontWeight: "600", color: COLORS.danger },
});
