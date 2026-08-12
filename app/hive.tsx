import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import AppText from "../components/AppText";
import Button from "../components/Button";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import ConfirmDiscardModal from "../components/ConfirmDiscardModal";
import DatePicker from "../components/DatePicker";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Picker, { PickerOption } from "../components/Picker";
import SearchBar from "../components/SearchBar";
import { GridSkeleton } from "../components/SkeletonLoader";
import { DraggableRowList } from "../components/DraggableRowList";
import { useApp } from "../context/AppContext";
import { Hive, HiveHealth, HiveNote, HiveRow, HiveType, SwarmStatus } from "../types";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

const healthOptions: PickerOption[] = [
  { label: "Dobro", value: "good" },
  { label: "Loše", value: "bad" },
];

type HiveEditFormData = {
  hiveNumber: string;
  health: string;
  hasQueen: boolean;
  queenId: string;
  newNote: string;
  notes: HiveNote[];
  lastInspection: Date | null;
  scheduledInspection: Date | null;
  frameCount: string;
  isHarvested: boolean;
  hasPollen: boolean;
  feedingDates: Date[];
  harvestDates: Date[];
  isActive: boolean;
  swarmStatus: SwarmStatus;
  swarmStartDate: Date | null;
};

const EMPTY_HIVE_EDIT_FORM: HiveEditFormData = {
  hiveNumber: "",
  health: "good",
  hasQueen: true,
  queenId: "",
  newNote: "",
  notes: [],
  lastInspection: null,
  scheduledInspection: null,
  frameCount: "10",
  isHarvested: false,
  hasPollen: false,
  feedingDates: [],
  harvestDates: [],
  isActive: true,
  swarmStatus: "empty",
  swarmStartDate: null,
};

export default function HivesScreen() {
  const { state, loading, error, updateLocation, refreshData } = useApp();
  const [selectedLocation, setSelectedLocation] = useState(
    state.locations[0]?.id || ""
  );
  const [expandedRows, setExpandedRows] = useState<string[]>(
    state.locations[0]?.rows[0]?.id ? [state.locations[0].rows[0].id] : []
  );
  const [addRowModalVisible, setAddRowModalVisible] = useState(false);
  const [editHiveModalVisible, setEditHiveModalVisible] = useState(false);
  const [editingHive, setEditingHive] = useState<Hive | null>(null);
  const [saving, setSaving] = useState(false);
  const [slotTypePickerVisible, setSlotTypePickerVisible] = useState(false);
  const [pendingSlotNumber, setPendingSlotNumber] = useState<number | null>(null);
  const [pendingSlotRowId, setPendingSlotRowId] = useState<string | null>(null);
  const [editSwarmModalVisible, setEditSwarmModalVisible] = useState(false);
  const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);
  // Single shared form for both the hive and swarm modals — every field lives
  // here regardless of which form is currently shown, so switching between
  // hive/swarm never has to selectively decide what to carry over: nothing
  // is ever dropped because there's only one object to begin with.
  const [hiveEditForm, setHiveEditForm] = useState<HiveEditFormData>(EMPTY_HIVE_EDIT_FORM);
  // Snapshot taken when the modal opens — compared against hiveEditForm to
  // detect unsaved changes (including a pending type switch, notes, dates,
  // everything) so we can warn before discarding them.
  const [initialHiveEditForm, setInitialHiveEditForm] = useState<HiveEditFormData>(EMPTY_HIVE_EDIT_FORM);
  const [formData, setFormData] = useState({
    rowName: "",
    capacity: "",
  });
  const [editRowModalVisible, setEditRowModalVisible] = useState(false);
  const [editingRow, setEditingRow] = useState<HiveRow | null>(null);
  const [editRowFormData, setEditRowFormData] = useState({ rowName: "", capacity: "" });

  const { width: screenWidth } = useWindowDimensions();

  const currentLocation = state.locations.find(
    (loc) => loc.id === selectedLocation
  );

  // Responsive hive box sizing
  const hiveGridPadding = SPACING.lg + SPACING.md;
  const hiveGridGap = SPACING.sm;
  const hiveAvailableWidth = screenWidth - hiveGridPadding * 2;
  const hiveMinBoxSize = 44;
  const hiveMaxBoxSize = 58;
  const hiveColumnsCount = Math.max(4, Math.floor((hiveAvailableWidth + hiveGridGap) / (hiveMinBoxSize + hiveGridGap)));
  const hiveBoxSize = Math.min(hiveMaxBoxSize, Math.floor((hiveAvailableWidth - (hiveColumnsCount - 1) * hiveGridGap) / hiveColumnsCount));

  const resetForm = () => {
    setFormData({ rowName: "", capacity: "" });
  };

  const resetHiveEditForm = () => {
    setHiveEditForm(EMPTY_HIVE_EDIT_FORM);
    setInitialHiveEditForm(EMPTY_HIVE_EDIT_FORM);
    setEditingHive(null);
  };

  // True if anything in the shared hive/swarm form differs from what was
  // loaded when the modal opened — covers every field (including a pending
  // type switch, staged notes, dates, etc.), not just the note input.
  const isHiveEditFormDirty =
    JSON.stringify(hiveEditForm) !== JSON.stringify(initialHiveEditForm);

  const closeHiveEditModal = () => {
    setEditHiveModalVisible(false);
    setEditSwarmModalVisible(false);
    resetHiveEditForm();
  };

  // Used by the "Otkaži" buttons, which close the modal directly and so
  // bypass the Modal component's own hasUnsavedChanges gate on the X
  // button/backdrop/back button — this keeps both paths consistent.
  const requestCloseHiveEditModal = () => {
    if (isHiveEditFormDirty) {
      setDiscardConfirmVisible(true);
    } else {
      closeHiveEditModal();
    }
  };

  const openAddModal = () => {
    resetForm();
    setAddRowModalVisible(true);
  };

  const openEditHiveModal = (hive: Hive, rowId: string) => {
    setEditingHive(hive);
    // Populate every field regardless of the hive's current type — hive-only
    // fields default sensibly when opening a swarm and vice versa, so nothing
    // is missing if the type gets switched inside the modal.
    const form: HiveEditFormData = {
      hiveNumber: hive.number.toString(),
      health: hive.health,
      hasQueen: hive.hasQueen ?? true,
      queenId: hive.queenId || "",
      newNote: "",
      notes: hive.notes ? [...hive.notes] : [],
      lastInspection: hive.lastInspection ? new Date(hive.lastInspection) : null,
      scheduledInspection: hive.scheduledInspection ? new Date(hive.scheduledInspection) : null,
      frameCount: hive.frameCount?.toString() || "10",
      isHarvested: hive.isHarvested || false,
      hasPollen: hive.hasPollen || false,
      feedingDates: (hive.feedingDates || []).map((d) => new Date(d)),
      harvestDates: (hive.harvestDates || []).map((d) => new Date(d)),
      isActive: hive.isActive !== false,
      swarmStatus: hive.swarmStatus || "empty",
      swarmStartDate: hive.swarmStartDate ? new Date(hive.swarmStartDate) : null,
    };
    setHiveEditForm(form);
    setInitialHiveEditForm(form);
    if (hive.type === 'swarm') {
      setEditSwarmModalVisible(true);
    } else {
      setEditHiveModalVisible(true);
    }
  };

  // Notes are staged locally (hiveEditForm.notes) and only persisted to
  // Supabase when the modal's "Sačuvaj" button is pressed — adding/removing
  // a note here must never write to the DB directly.
  const handleAddNote = () => {
    if (!hiveEditForm.newNote.trim()) return;

    const newNote: HiveNote = {
      id: Crypto.randomUUID(),
      text: hiveEditForm.newNote.trim(),
      createdAt: new Date(),
    };

    setHiveEditForm({ ...hiveEditForm, newNote: "", notes: [...hiveEditForm.notes, newNote] });
  };

  const handleDeleteNote = (noteId: string) => {
    setHiveEditForm({ ...hiveEditForm, notes: hiveEditForm.notes.filter((n) => n.id !== noteId) });
  };

  const handleSaveHive = async () => {
    if (!editingHive || !currentLocation) return;
    setSaving(true);

    const updatedHive: Hive = {
      ...editingHive,
      type: 'hive',
      number: parseInt(hiveEditForm.hiveNumber) || editingHive.number,
      health: hiveEditForm.health as HiveHealth,
      hasQueen: hiveEditForm.hasQueen,
      queenId: hiveEditForm.queenId || undefined,
      lastInspection: hiveEditForm.lastInspection || undefined,
      scheduledInspection: hiveEditForm.scheduledInspection || undefined,
      frameCount: parseInt(hiveEditForm.frameCount) || 10,
      isHarvested: hiveEditForm.isHarvested,
      hasPollen: hiveEditForm.hasPollen,
      feedingDates: hiveEditForm.feedingDates,
      lastFeedingDate: hiveEditForm.feedingDates.length > 0
        ? hiveEditForm.feedingDates[hiveEditForm.feedingDates.length - 1]
        : undefined,
      harvestDates: hiveEditForm.harvestDates,
      lastHarvestDate: hiveEditForm.harvestDates.length > 0
        ? hiveEditForm.harvestDates[hiveEditForm.harvestDates.length - 1]
        : undefined,
      notes: hiveEditForm.notes,
      updatedAt: new Date(),
      // Hives don't carry swarm-only fields — clear them in case we're
      // converting from a swarm that had them set.
      swarmStatus: undefined,
      swarmStartDate: undefined,
      ...(hiveEditForm.isActive !== undefined && {
        isActive: hiveEditForm.isActive,
      }),
    };

    // Update the hive in the location's rows
    const updatedRows = currentLocation.rows.map((row) => ({
      ...row,
      hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)),
    }));

    await updateLocation(currentLocation.id, {
      rows: updatedRows,
    });

    setSaving(false);
    setEditHiveModalVisible(false);
    resetHiveEditForm();
  };

  const handleAddRow = async () => {
    if (!currentLocation || !formData.rowName || !formData.capacity) {
      return;
    }

    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      return;
    }
    setSaving(true);

    const now = new Date();
    const newRowId = Crypto.randomUUID();

    // Create new row with capacity — slots start empty
    const newRow: HiveRow = {
      id: newRowId,
      name: formData.rowName,
      locationId: currentLocation.id,
      capacity,
      hives: [],
      order: currentLocation.rows.length,
      createdAt: now,
      updatedAt: now,
    };

    const updatedRows = [...currentLocation.rows, newRow];
    await updateLocation(currentLocation.id, { rows: updatedRows });

    setSaving(false);
    setExpandedRows([newRowId]);
    setAddRowModalVisible(false);
    resetForm();
  };

  const handleEmptySlotPress = (rowId: string, slotNumber: number) => {
    setPendingSlotRowId(rowId);
    setPendingSlotNumber(slotNumber);
    setSlotTypePickerVisible(true);
  };

  const handleAddSlotWithType = async (type: HiveType) => {
    if (!currentLocation || !pendingSlotRowId || pendingSlotNumber === null) return;
    setSlotTypePickerVisible(false);

    const now = new Date();
    const newHive: Hive = {
      id: Crypto.randomUUID(),
      number: pendingSlotNumber,
      locationId: currentLocation.id,
      rowId: pendingSlotRowId,
      type,
      health: "good",
      ...(type === 'hive' ? { hasQueen: true, frameCount: 10 } : { swarmStatus: "empty" as SwarmStatus }),
      createdAt: now,
      updatedAt: now,
    };

    const updatedRows = currentLocation.rows.map((r) =>
      r.id === pendingSlotRowId
        ? { ...r, hives: [...r.hives, newHive], updatedAt: now }
        : r
    );

    setPendingSlotRowId(null);
    setPendingSlotNumber(null);
    await updateLocation(currentLocation.id, { rows: updatedRows });
  };

  const handleRemoveSlot = (rowId: string, hiveId: string, hiveNumber: number, type: HiveType) => {
    if (!currentLocation) return;
    setDeleteConfirm({ visible: true, rowId, hiveId, hiveNumber, type });
  };

  const confirmRemoveSlot = async () => {
    if (!deleteConfirm || !currentLocation) return;
    const { rowId, hiveId } = deleteConfirm;
    setDeleteConfirm(null);
    const updatedRows = currentLocation.rows.map((r) =>
      r.id === rowId
        ? { ...r, hives: r.hives.filter((h) => h.id !== hiveId), updatedAt: new Date() }
        : r
    );
    await updateLocation(currentLocation.id, { rows: updatedRows });
  };

  const handleSaveSwarm = async () => {
    if (!editingHive || !currentLocation) return;
    setSaving(true);

    const updatedHive: Hive = {
      ...editingHive,
      type: 'swarm',
      health: hiveEditForm.health as HiveHealth,
      swarmStatus: hiveEditForm.swarmStatus,
      swarmStartDate: hiveEditForm.swarmStartDate || undefined,
      isActive: hiveEditForm.isActive,
      scheduledInspection: hiveEditForm.scheduledInspection || undefined,
      notes: hiveEditForm.notes,
      updatedAt: new Date(),
      // Swarms don't carry hive-only fields — clear them in case we're
      // converting from a hive that had them set.
      hasQueen: undefined,
      queenId: undefined,
      frameCount: undefined,
      isHarvested: undefined,
      hasPollen: undefined,
      feedingDates: undefined,
      harvestDates: undefined,
      lastFeedingDate: undefined,
      lastHarvestDate: undefined,
      lastInspection: undefined,
    };

    const updatedRows = currentLocation.rows.map((row) => ({
      ...row,
      hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)),
    }));

    await updateLocation(currentLocation.id, { rows: updatedRows });
    setSaving(false);
    setEditSwarmModalVisible(false);
    resetHiveEditForm();
    setEditingHive(null);
  };

  const handleOpenEditRow = (row: HiveRow) => {
    setEditingRow(row);
    setEditRowFormData({ rowName: row.name, capacity: row.capacity.toString() });
    setEditRowModalVisible(true);
  };

  const handleSaveRow = async () => {
    if (!currentLocation || !editingRow) return;
    const capacity = parseInt(editRowFormData.capacity);
    if (isNaN(capacity) || capacity <= 0) return;
    setSaving(true);
    const updatedRows = currentLocation.rows.map((r) =>
      r.id === editingRow.id
        ? { ...r, name: editRowFormData.rowName, capacity, updatedAt: new Date() }
        : r
    );
    await updateLocation(currentLocation.id, { rows: updatedRows });
    setSaving(false);
    setEditRowModalVisible(false);
    setEditingRow(null);
  };

  const handleDeleteRow = (rowId: string, rowName: string) => {
    if (!currentLocation) return;
    setDeleteRowConfirm({ visible: true, rowId, rowName });
  };

  const confirmDeleteRow = async () => {
    if (!deleteRowConfirm || !currentLocation) return;
    const { rowId } = deleteRowConfirm;
    setDeleteRowConfirm(null);
    setExpandedRows((prev) => prev.filter((id) => id !== rowId));
    const updatedRows = currentLocation.rows.filter((r) => r.id !== rowId);
    await updateLocation(currentLocation.id, { rows: updatedRows });
  };

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
  };

  // Hive health — green / red
  const getHealthColor = (health: string) => {
    switch (health) {
      case "good":  return "#16A34A"; // green-600
      case "bad":   return "#DC2626"; // red-600
      default:      return COLORS.textMuted;
    }
  };

  const getHealthBg = (health: string) => {
    switch (health) {
      case "good": return "#DCFCE7"; // green-100
      case "bad":  return "#FEE2E2"; // red-100
      default:     return COLORS.background;
    }
  };

  // Queen indicator — violet (has) / orange (no)
  const QUEEN_YES_COLOR = "#7C3AED"; // violet-600
  const QUEEN_NO_COLOR  = "#EA580C"; // orange-600

  const getSwarmStatusLabel = (status: SwarmStatus) => {
    switch (status) {
      case "empty":      return "Prazan";
      case "developing": return "Razvija se";
      case "ready":      return "Spreman";
      case "natural":    return "Prirodni";
    }
  };

  // Swarm status — each state has a unique color, all distinct from health colors
  const getSwarmStatusColor = (status: SwarmStatus) => {
    switch (status) {
      case "empty":      return "#9CA3AF"; // gray
      case "developing": return "#D97706"; // amber-600
      case "ready":      return "#0891B2"; // cyan-600
      case "natural":    return "#2563EB"; // blue-600
    }
  };

  const getSwarmStatusBg = (status: SwarmStatus) => {
    switch (status) {
      case "empty":      return "#F3F4F6"; // gray-100
      case "developing": return "#FEF3C7"; // amber-100
      case "ready":      return "#CFFAFE"; // cyan-100
      case "natural":    return "#DBEAFE"; // blue-100
    }
  };

  const getRowStats = (row: HiveRow) => {
    const hiveItems = row.hives.filter((h) => h.type === "hive");
    const swarmItems = row.hives.filter((h) => h.type === "swarm");
    const empty = row.capacity - row.hives.length;
    return {
      hives: hiveItems.length,
      swarms: swarmItems.length,
      empty,
      total: row.capacity,
      filled: row.hives.length,
    };
  };

  const getLocationStats = (location: any) => {
    const totalSlots = location.rows.reduce(
      (sum: number, row: any) => sum + (row.capacity || row.hives.length),
      0
    );
    const totalFilled = location.rows.reduce(
      (sum: number, row: any) => sum + row.hives.length,
      0
    );
    const totalRows = location.rows.length;
    return { totalSlots, totalFilled, totalRows };
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isDraggingRows, setIsDraggingRows] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    rowId: string;
    hiveId: string;
    hiveNumber: number;
    type: HiveType;
  } | null>(null);
  const [deleteRowConfirm, setDeleteRowConfirm] = useState<{
    visible: boolean;
    rowId: string;
    rowName: string;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState<string | null>(null);
  const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkForm, setBulkForm] = useState<{
    applyType: boolean;
    type: HiveType;
    applyHealth: boolean;
    health: HiveHealth;
    applyFeedingDate: boolean;
    feedingDate: Date | null;
    applyHarvestDate: boolean;
    harvestDate: Date | null;
    applyNote: boolean;
    noteText: string;
  }>({
    applyType: false,
    type: 'swarm',
    applyHealth: false,
    health: 'bad',
    applyFeedingDate: false,
    feedingDate: null,
    applyHarvestDate: false,
    harvestDate: null,
    applyNote: false,
    noteText: '',
  });

  const handleBulkApply = async () => {
    if (!currentLocation || selectedHiveIds.size === 0) return;
    setSaving(true);
    const now = new Date();

    const updatedRows = currentLocation.rows.map((row) => ({
      ...row,
      hives: row.hives.map((hive) => {
        if (!selectedHiveIds.has(hive.id)) return hive;
        let updated: Hive = { ...hive, updatedAt: now };

        if (bulkForm.applyType) {
          if (bulkForm.type === 'swarm') {
            updated = {
              ...updated,
              type: 'swarm',
              swarmStatus: 'empty' as SwarmStatus,
              hasQueen: undefined,
              queenId: undefined,
              frameCount: undefined,
              isHarvested: undefined,
              hasPollen: undefined,
              feedingDates: undefined,
              harvestDates: undefined,
              lastFeedingDate: undefined,
              lastHarvestDate: undefined,
              lastInspection: undefined,
            };
          } else {
            updated = {
              ...updated,
              type: 'hive',
              hasQueen: true,
              frameCount: 10,
              swarmStatus: undefined,
              swarmStartDate: undefined,
            };
          }
        }

        if (bulkForm.applyHealth) {
          updated = { ...updated, health: bulkForm.health };
        }

        if (bulkForm.applyFeedingDate && bulkForm.feedingDate && updated.type === 'hive') {
          const existing = updated.feedingDates || [];
          const newDates = [...existing, bulkForm.feedingDate].sort((a, b) => b.getTime() - a.getTime());
          updated = { ...updated, feedingDates: newDates, lastFeedingDate: newDates[0] };
        }

        if (bulkForm.applyHarvestDate && bulkForm.harvestDate && updated.type === 'hive') {
          const existing = updated.harvestDates || [];
          const newDates = [...existing, bulkForm.harvestDate].sort((a, b) => b.getTime() - a.getTime());
          updated = { ...updated, harvestDates: newDates, lastHarvestDate: newDates[0], isHarvested: true };
        }

        if (bulkForm.applyNote && bulkForm.noteText.trim()) {
          const newNote: HiveNote = {
            id: Crypto.randomUUID(),
            text: bulkForm.noteText.trim(),
            createdAt: now,
          };
          updated = { ...updated, notes: [...(updated.notes || []), newNote] };
        }

        return updated;
      }),
    }));

    await updateLocation(currentLocation.id, { rows: updatedRows });
    setSaving(false);
    setBulkModalVisible(false);
    setSelectionMode(null);
    setSelectedHiveIds(new Set());
    setBulkForm({
      applyType: false, type: 'swarm',
      applyHealth: false, health: 'bad',
      applyFeedingDate: false, feedingDate: null,
      applyHarvestDate: false, harvestDate: null,
      applyNote: false, noteText: '',
    });
  };

  const handleRowsReorder = useCallback(async (reorderedRows: HiveRow[]) => {
    if (!currentLocation) return;
    const withOrder = reorderedRows.map((row, i) => ({ ...row, order: i }));
    await updateLocation(currentLocation.id, { rows: withOrder });
  }, [currentLocation, updateLocation]);

  if (loading) {
    return (
      <View style={styles.container}>
        <GridSkeleton rows={2} cols={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
        <AppText style={styles.loadingText}>{error}</AppText>
        <Button title="Pokušaj ponovo" onPress={refreshData} style={{ marginTop: SPACING.md }} />
      </View>
    );
  }

  // Filter rows by search query (hive number)
  const getFilteredRows = (rows: HiveRow[]) => {
    if (!searchQuery) return rows;
    return rows
      .map(row => ({
        ...row,
        hives: row.hives.filter(h =>
          h.number.toString().includes(searchQuery) ||
          row.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter(row => row.hives.length > 0);
  };

  const displayRows = currentLocation ? getFilteredRows(currentLocation.rows) : [];

  return (
    <View style={styles.container}>
      {/* Header with Refresh */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshData}
          disabled={loading}
          accessibilityLabel="Osviježi podatke"
        >
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Location Selector */}
      <View style={styles.locationSelector}>
        {state.locations.map((location) => {
          const stats = getLocationStats(location);
          const isSelected = selectedLocation === location.id;
          return (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.locationButton,
                isSelected && styles.locationButtonActive,
              ]}
              onPress={() => {
                setSelectedLocation(location.id);
                // Auto-expand first row of selected location
                if (location.rows.length > 0) {
                  setExpandedRows([location.rows[0].id]);
                }
              }}
            >
              <Ionicons
                name={location.icon as any}
                size={FONT_SIZE.xl}
                color={isSelected ? COLORS.surface : COLORS.textPrimary}
              />
              <View style={styles.locationInfo}>
                <AppText
                  style={[
                    styles.locationName,
                    isSelected && styles.locationNameActive,
                  ]}
                >
                  {location.name}
                </AppText>
                <AppText
                  style={[
                    styles.locationStats,
                    isSelected && styles.locationStatsActive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {stats.totalRows} redova • {stats.totalFilled}/{stats.totalSlots} mjesta
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Pretraži košnice po broju..." />

      {/* Color Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: "#16A34A", backgroundColor: "#DCFCE7" }]} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Zdravo</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: "#DC2626", backgroundColor: "#FEE2E2" }]} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Loše</AppText>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="checkmark-circle" size={12} color="#7C3AED" />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Ima maticu</AppText>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="close-circle" size={12} color="#EA580C" />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Nema matice</AppText>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="flower" size={12} color={COLORS.primary} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Polen</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: "#9CA3AF", backgroundColor: "#F3F4F6" }]} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Roj: Prazan</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: "#D97706", backgroundColor: "#FEF3C7" }]} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Razvija se</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: "#0891B2", backgroundColor: "#CFFAFE" }]} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Spreman</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: "#2563EB", backgroundColor: "#DBEAFE" }]} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Prirodni</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: COLORS.borderMedium, opacity: 0.5 }]} />
          <AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Neaktivna</AppText>
        </View>
      </View>

      {/* Rows List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isDraggingRows}
      >
        <DraggableRowList
          rows={displayRows}
          disabled={!!searchQuery}
          onReorder={handleRowsReorder}
          onDragStart={() => setIsDraggingRows(true)}
          onDragEnd={() => setIsDraggingRows(false)}
          renderRow={(row) => {
          const isExpanded = expandedRows.includes(row.id);
          const stats = getRowStats(row);

          return (
            <View style={styles.rowContainer}>
              {/* Row Header */}
              <TouchableOpacity
                style={styles.rowHeader}
                onPress={() => toggleRow(row.id)}
              >
                <View style={styles.rowHeaderLeft}>
                  <Ionicons
                    name={isExpanded ? "chevron-down" : "chevron-forward"}
                    size={FONT_SIZE.xl}
                    color={COLORS.textPrimary}
                  />
                  <AppText style={styles.rowName}>{row.name}</AppText>
                  <View style={styles.rowBadge}>
                    <AppText style={styles.rowBadgeText} allowFontScaling={false}>{stats.filled}/{stats.total}</AppText>
                  </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <View key="hives" style={styles.statDot}>
                    <Ionicons name="grid-outline" size={12} color={COLORS.accent.hive} />
                    <AppText style={styles.statNumber} allowFontScaling={false}>{stats.hives}</AppText>
                  </View>
                  <View key="swarms" style={styles.statDot}>
                    <Ionicons name="cube-outline" size={12} color={COLORS.accent.swarm} />
                    <AppText style={styles.statNumber} allowFontScaling={false}>{stats.swarms}</AppText>
                  </View>
                  <View key="empty" style={styles.statDot}>
                    <View style={[styles.dot, { backgroundColor: COLORS.borderMedium }]} />
                    <AppText style={styles.statNumber} allowFontScaling={false}>{stats.empty}</AppText>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Hives Grid (shown when expanded) */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {selectionMode === row.id && (
                    <View style={styles.selectionBanner}>
                      <TouchableOpacity
                        onPress={() => {
                          const allIds = row.hives.map((h) => h.id);
                          const allSelected = allIds.every((id) => selectedHiveIds.has(id));
                          setSelectedHiveIds(allSelected ? new Set() : new Set(allIds));
                        }}
                      >
                        <AppText style={styles.selectionBannerLink} maxFontSizeMultiplier={1} numberOfLines={1}>
                          {row.hives.length > 0 && row.hives.every((h) => selectedHiveIds.has(h.id))
                            ? 'Odznači sve'
                            : 'Odaberi sve'}
                        </AppText>
                      </TouchableOpacity>
                      <AppText style={styles.selectionCount} maxFontSizeMultiplier={1} numberOfLines={1}>{selectedHiveIds.size} odabrano</AppText>
                      <TouchableOpacity
                        style={[styles.selectionApplyBtn, selectedHiveIds.size === 0 && { opacity: 0.4 }]}
                        onPress={() => { if (selectedHiveIds.size > 0) setBulkModalVisible(true); }}
                      >
                        <AppText style={styles.selectionApplyText} maxFontSizeMultiplier={1} numberOfLines={1}>Primijeni</AppText>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.hivesGrid}>
                    {Array.from({ length: row.capacity }, (_, i) => i + 1).map((slotNum) => {
                      const hive = row.hives.find((h) => h.number === slotNum);

                      if (!hive) {
                        // Empty slot
                        return (
                          <TouchableOpacity
                            key={`empty-${slotNum}`}
                            style={[
                              styles.hiveBox,
                              styles.emptySlot,
                              { width: hiveBoxSize, height: hiveBoxSize, borderRadius: hiveBoxSize * 0.16 },
                            ]}
                            onPress={() => handleEmptySlotPress(row.id, slotNum)}
                            accessibilityLabel={`Prazan slot ${slotNum}`}
                            accessibilityHint="Pritisni da dodaš košnicu ili roj"
                          >
                            <AppText style={styles.emptySlotNumber} allowFontScaling={false}>{slotNum}</AppText>
                            <Ionicons name="add" size={FONT_SIZE.sm} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        );
                      }

                      const isInactive = hive.isActive === false;
                      const isSwarm = hive.type === 'swarm';

                      const isSelected = selectionMode === row.id && selectedHiveIds.has(hive.id);
                      return (
                        <TouchableOpacity
                          key={hive.id}
                          style={[
                            styles.hiveBox,
                            { width: hiveBoxSize, height: hiveBoxSize, borderRadius: hiveBoxSize * 0.16 },
                            isSwarm
                              ? { borderColor: getSwarmStatusColor(hive.swarmStatus || 'empty'), backgroundColor: getSwarmStatusBg(hive.swarmStatus || 'empty') }
                              : { borderColor: getHealthColor(hive.health), backgroundColor: getHealthBg(hive.health) },
                            isInactive && styles.hiveBoxInactive,
                            isSelected && styles.hiveBoxSelected,
                          ]}
                          onPress={() => {
                            if (selectionMode === row.id) {
                              setSelectedHiveIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(hive.id)) next.delete(hive.id);
                                else next.add(hive.id);
                                return next;
                              });
                            } else {
                              openEditHiveModal(hive, row.id);
                            }
                          }}
                          onLongPress={() => {
                            if (selectionMode === row.id) return;
                            handleRemoveSlot(row.id, hive.id, hive.number, hive.type);
                          }}
                          accessibilityLabel={`${isSwarm ? 'Roj' : 'Košnica'} ${hive.number}`}
                          accessibilityHint={selectionMode === row.id ? "Pritisni za odabir" : "Pritisni za izmjenu, dugo drži za brisanje"}
                        >
                          <AppText
                            style={[
                              styles.hiveNumber,
                              isInactive && styles.hiveNumberInactive,
                              isSwarm && { color: getSwarmStatusColor(hive.swarmStatus || 'empty') },
                            ]}
                            allowFontScaling={false}
                          >
                            {hive.number}
                          </AppText>
                          {isSwarm ? (
                            <Ionicons
                              name="cube"
                              size={FONT_SIZE.xs}
                              color={getSwarmStatusColor(hive.swarmStatus || 'empty')}
                              style={styles.queenIcon}
                            />
                          ) : hive.hasQueen ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={FONT_SIZE.xs}
                              color={QUEEN_YES_COLOR}
                              style={styles.queenIcon}
                            />
                          ) : (
                            <Ionicons
                              name="close-circle"
                              size={FONT_SIZE.xs}
                              color={QUEEN_NO_COLOR}
                              style={styles.queenIcon}
                            />
                          )}
                          {!isSwarm && hive.hasPollen && (
                            <Ionicons
                              name="flower"
                              size={FONT_SIZE.md}
                              color={COLORS.primary}
                              style={styles.pollenIcon}
                            />
                          )}
                          {isInactive && (
                            <Ionicons
                              name="close-circle"
                              size={FONT_SIZE.md}
                              color={COLORS.textMuted}
                              style={styles.inactiveIcon}
                            />
                          )}
                          {isSelected && (
                            <View style={[styles.selectionOverlay, { borderRadius: hiveBoxSize * 0.16 }]}>
                              <Ionicons name="checkmark" size={hiveBoxSize * 0.45} color={COLORS.surface} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Row Actions */}
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={styles.rowActionButton}
                      onPress={() => handleOpenEditRow(row)}
                    >
                      <Ionicons name="create-outline" size={SPACING.xl} color={COLORS.primary} />
                      <AppText style={[styles.rowActionText, { color: COLORS.primary }]}>
                        Uredi red
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rowActionButton}
                      onPress={() => {
                        if (selectionMode === row.id) {
                          setSelectionMode(null);
                          setSelectedHiveIds(new Set());
                        } else {
                          setSelectionMode(row.id);
                          setSelectedHiveIds(new Set());
                        }
                      }}
                    >
                      <Ionicons
                        name={selectionMode === row.id ? "close-circle-outline" : "checkmark-done-outline"}
                        size={SPACING.xl}
                        color={selectionMode === row.id ? COLORS.textMuted : COLORS.success}
                      />
                      <AppText style={[styles.rowActionText, { color: selectionMode === row.id ? COLORS.textMuted : COLORS.success }]}>
                        {selectionMode === row.id ? 'Otkaži' : 'Odaberi'}
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rowActionButton}
                      onPress={() => handleDeleteRow(row.id, row.name)}
                    >
                      <Ionicons name="trash-outline" size={SPACING.xl} color={COLORS.danger} />
                      <AppText style={[styles.rowActionText, { color: COLORS.danger }]}>
                        Obriši red
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
          }}
        />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={FONT_SIZE.xxl} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Add Row Modal */}
      <Modal
        visible={addRowModalVisible}
        onClose={() => {
          setAddRowModalVisible(false);
          resetForm();
        }}
        title="Dodaj Novi Red"
        hasUnsavedChanges={formData.rowName !== '' || formData.capacity !== ''}
      >
        <Input
          label="Naziv reda"
          value={formData.rowName}
          onChangeText={(text) => setFormData({ ...formData, rowName: text })}
          placeholder="Npr. Red 1, Red A, Severni red..."
        />

        <Input
          label="Broj mjesta (kapacitet)"
          value={formData.capacity}
          onChangeText={(text) => setFormData({ ...formData, capacity: text })}
          placeholder="Npr. 30"
          keyboardType="numeric"
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={SPACING.xl} color={COLORS.primary} />
          <AppText style={styles.infoText}>
            Biće kreiran red sa {formData.capacity || "0"} praznih mjesta.
            Košnice i rojeve dodajete klikom na prazan slot.
          </AppText>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setAddRowModalVisible(false);
              resetForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Dodaj Red"
            onPress={handleAddRow}
            disabled={!formData.rowName || !formData.capacity}
            loading={saving}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
      </Modal>

      {/* Edit Hive Modal */}
      <Modal
        visible={editHiveModalVisible}
        onClose={closeHiveEditModal}
        title={`Košnica ${editingHive?.number || ""}`}
        hasUnsavedChanges={isHiveEditFormDirty}
      >
        {/* Type Switcher */}
        <View style={styles.typeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.typeSwitcherOption, styles.typeSwitcherOptionActive, { borderColor: COLORS.accent.hive }]}
          >
            <Ionicons name="grid-outline" size={18} color={COLORS.accent.hive} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.accent.hive }]}>Košnica</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeSwitcherOption]}
            onPress={() => {
              if (!editingHive) return;
              // Switch which form is shown only — nothing is written to the DB
              // here, and every field stays exactly as-is since hiveEditForm is
              // shared between both forms. The type conversion (and everything
              // currently staged) is only persisted when "Sačuvaj" is pressed.
              // `editingHive` stays untouched so Cancel always discards back to
              // the real saved state.
              setEditHiveModalVisible(false);
              setEditSwarmModalVisible(true);
            }}
          >
            <Ionicons name="cube-outline" size={18} color={COLORS.textMuted} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.textMuted }]}>Roj</AppText>
          </TouchableOpacity>
        </View>

        {/* Opšte Informacije Section */}
        <View style={styles.sectionContainer}>
          <AppText style={styles.sectionTitle}>Opšte informacije</AppText>

          <Input
            label="Broj košnice"
            value={hiveEditForm.hiveNumber}
            onChangeText={(text) =>
              setHiveEditForm({ ...hiveEditForm, hiveNumber: text })
            }
            placeholder="Npr. 1, 2, 3..."
            keyboardType="numeric"
          />

          <Picker
            label="Zdravlje košnice"
            value={hiveEditForm.health}
            options={healthOptions}
            onValueChange={(value) =>
              setHiveEditForm({ ...hiveEditForm, health: value as HiveHealth })
            }
          />

          <View style={styles.switchRow}>
            <AppText style={styles.switchLabel}>Ima maticu</AppText>
            <TouchableOpacity
              style={[
                styles.switch,
                hiveEditForm.hasQueen && styles.switchActive,
              ]}
              onPress={() =>
                setHiveEditForm({
                  ...hiveEditForm,
                  hasQueen: !hiveEditForm.hasQueen,
                })
              }
            >
              <View
                style={[
                  styles.switchThumb,
                  hiveEditForm.hasQueen && styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <Input
            label="Broj ramova"
            value={hiveEditForm.frameCount}
            onChangeText={(text) =>
              setHiveEditForm({ ...hiveEditForm, frameCount: text })
            }
            placeholder="10"
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <AppText style={styles.switchLabel}>Aktivna košnica</AppText>
            <TouchableOpacity
              style={[
                styles.switch,
                hiveEditForm.isActive && styles.switchActive,
              ]}
              onPress={() => {
                const newIsActive = !hiveEditForm.isActive;
                if (newIsActive) {
                  // Reactivating - reset all dates for new colony
                  setHiveEditForm({
                    ...hiveEditForm,
                    isActive: true,
                    health: "good",
                    hasQueen: true,
                    lastInspection: null,
                    isHarvested: false,
                    hasPollen: false,
                    feedingDates: [],
                    harvestDates: [],
                    newNote: "",
                  });
                } else {
                  // Deactivating
                  setHiveEditForm({
                    ...hiveEditForm,
                    isActive: false,
                  });
                }
              }}
            >
              <View
                style={[
                  styles.switchThumb,
                  hiveEditForm.isActive && styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Održavanje Section */}
        <View style={styles.sectionContainer}>
          <AppText style={styles.sectionTitle}>Održavanje</AppText>

          {/* Feeding Dates Section */}
          <View style={styles.feedingSection}>
            <AppText style={styles.feedingLabel}>
              Prihrane ({hiveEditForm.feedingDates.length})
            </AppText>
            <DatePicker
              label="Dodaj novu prihranu"
              value={null}
              onChange={(date) => {
                if (date) {
                  setHiveEditForm({
                    ...hiveEditForm,
                    feedingDates: [...hiveEditForm.feedingDates, date].sort(
                      (a, b) => b.getTime() - a.getTime()
                    ),
                  });
                }
              }}
            />
            {hiveEditForm.feedingDates.length > 0 && (
              <View style={styles.feedingList}>
                {hiveEditForm.feedingDates.map((date, index) => (
                  <View key={index} style={styles.feedingItem}>
                    <AppText style={styles.feedingDate}>{formatDate(date)}</AppText>
                    <TouchableOpacity
                      onPress={() => {
                        setHiveEditForm({
                          ...hiveEditForm,
                          feedingDates: hiveEditForm.feedingDates.filter(
                            (_, i) => i !== index
                          ),
                        });
                      }}
                      style={styles.deleteFeedingButton}
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
            value={hiveEditForm.lastInspection}
            onChange={(date) =>
              setHiveEditForm({ ...hiveEditForm, lastInspection: date })
            }
          />
          <View style={styles.scheduledRow}>
            <View style={styles.scheduledInfo}>
              <Ionicons name="calendar" size={16} color="#835500" />
              <AppText style={styles.scheduledLabel}>Zakazana inspekcija</AppText>
            </View>
            {hiveEditForm.scheduledInspection && (
              <View style={styles.scheduledChip}>
                <AppText style={styles.scheduledChipText}>
                  {hiveEditForm.scheduledInspection.toLocaleDateString("sr-Latn-BA", { day: "2-digit", month: "short", year: "numeric" })}
                </AppText>
                <TouchableOpacity onPress={() => setHiveEditForm({ ...hiveEditForm, scheduledInspection: null })}>
                  <Ionicons name="close-circle" size={16} color="#835500" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <DatePicker
            label="Zakaži inspekciju"
            value={hiveEditForm.scheduledInspection}
            onChange={(date) => setHiveEditForm({ ...hiveEditForm, scheduledInspection: date })}
            placeholder="Odaberi datum inspekcije..."
          />
        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <AppText style={styles.notesLabel}>Bilješke</AppText>

          {/* Staged notes — persisted only when Sačuvaj is pressed */}
          {hiveEditForm.notes.length > 0 && (
            <View style={styles.notesList}>
              {hiveEditForm.notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteContent}>
                    <AppText style={styles.noteText}>{note.text}</AppText>
                    <AppText style={styles.noteDate}>
                      {formatDate(note.createdAt)}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteNote(note.id)}
                    style={styles.deleteNoteButton}
                  >
                    <Ionicons name="trash-outline" size={SPACING.xl} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add new note */}
          <View style={styles.addNoteContainer}>
            <Input
              value={hiveEditForm.newNote}
              onChangeText={(text) =>
                setHiveEditForm({ ...hiveEditForm, newNote: text })
              }
              placeholder="Dodaj novu bilješku..."
              multiline
              numberOfLines={3}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button
              title="Dodaj"
              onPress={handleAddNote}
              disabled={!hiveEditForm.newNote.trim()}
              style={styles.addNoteButton}
            />
          </View>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={requestCloseHiveEditModal}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Sačuvaj"
            onPress={handleSaveHive}
            loading={saving}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
        <TouchableOpacity
          style={styles.deleteHiveButton}
          onPress={() => {
            if (!editingHive || !currentLocation) return;
            const rowId = editingHive.rowId;
            const hiveId = editingHive.id;
            const hiveNumber = editingHive.number;
            setEditHiveModalVisible(false);
            resetHiveEditForm();
            handleRemoveSlot(rowId, hiveId, hiveNumber, 'hive');
          }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          <AppText style={styles.deleteHiveButtonText}>Obriši košnicu</AppText>
        </TouchableOpacity>
      </Modal>

      {/* Slot Type Picker Modal */}
      <Modal
        visible={slotTypePickerVisible}
        onClose={() => {
          setSlotTypePickerVisible(false);
          setPendingSlotRowId(null);
          setPendingSlotNumber(null);
        }}
        title={`Slot ${pendingSlotNumber || ""} — Izaberite tip`}
      >
        <View style={styles.slotTypePickerContainer}>
          <TouchableOpacity
            style={[styles.slotTypeOption, { borderColor: COLORS.accent.hive }]}
            onPress={() => handleAddSlotWithType('hive')}
          >
            <Ionicons name="grid-outline" size={32} color={COLORS.accent.hive} />
            <AppText style={styles.slotTypeLabel}>Košnica</AppText>
            <AppText style={styles.slotTypeDesc}>Aktivna košnica za proizvodnju meda</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.slotTypeOption, { borderColor: COLORS.accent.swarm }]}
            onPress={() => handleAddSlotWithType('swarm')}
          >
            <Ionicons name="cube-outline" size={32} color={COLORS.accent.swarm} />
            <AppText style={styles.slotTypeLabel}>Roj</AppText>
            <AppText style={styles.slotTypeDesc}>Roj u razvoju ili spreman za prodaju</AppText>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit Row Modal */}
      <Modal
        visible={editRowModalVisible}
        onClose={() => {
          setEditRowModalVisible(false);
          setEditingRow(null);
        }}
        title="Uredi Red"
        hasUnsavedChanges={
          editingRow !== null &&
          (editRowFormData.rowName !== editingRow.name ||
            editRowFormData.capacity !== editingRow.capacity.toString())
        }
      >
        <Input
          label="Naziv reda"
          value={editRowFormData.rowName}
          onChangeText={(text) => setEditRowFormData({ ...editRowFormData, rowName: text })}
          placeholder="Npr. Red 1, Red A..."
        />

        <Input
          label="Broj mjesta (kapacitet)"
          value={editRowFormData.capacity}
          onChangeText={(text) => setEditRowFormData({ ...editRowFormData, capacity: text })}
          placeholder="Npr. 30"
          keyboardType="numeric"
        />

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setEditRowModalVisible(false);
              setEditingRow(null);
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Sačuvaj"
            onPress={handleSaveRow}
            disabled={!editRowFormData.rowName || !editRowFormData.capacity}
            loading={saving}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
      </Modal>

      {/* Discard Unsaved Changes Confirmation (hive/swarm edit modal "Otkaži") */}
      <ConfirmDiscardModal
        visible={discardConfirmVisible}
        onCancel={() => setDiscardConfirmVisible(false)}
        onDiscard={() => {
          setDiscardConfirmVisible(false);
          closeHiveEditModal();
        }}
      />

      {/* Delete Hive/Swarm Confirmation */}
      <ConfirmDeleteModal
        visible={deleteConfirm?.visible === true}
        title={deleteConfirm?.type === 'swarm' ? 'Obriši Roj' : 'Obriši Košnicu'}
        message={
          deleteConfirm?.type === 'swarm'
            ? `Da li ste sigurni da želite da obrišete roj ${deleteConfirm?.hiveNumber}? Ova akcija se ne može poništiti.`
            : `Da li ste sigurni da želite da obrišete košnicu ${deleteConfirm?.hiveNumber}? Ova akcija se ne može poništiti.`
        }
        onConfirm={confirmRemoveSlot}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Delete Row Confirmation */}
      <ConfirmDeleteModal
        visible={deleteRowConfirm?.visible === true}
        title="Obriši Red"
        message={`Da li ste sigurni da želite da obrišete "${deleteRowConfirm?.rowName}" i sve košnice u njemu? Ova akcija se ne može poništiti.`}
        onConfirm={confirmDeleteRow}
        onCancel={() => setDeleteRowConfirm(null)}
      />

      {/* Bulk Edit Modal */}
      <Modal
        visible={bulkModalVisible}
        onClose={() => setBulkModalVisible(false)}
        title={`Grupno ažuriranje (${selectedHiveIds.size})`}
      >
        {/* Type change */}
        <TouchableOpacity
          style={[styles.bulkToggleRow, bulkForm.applyType && styles.bulkToggleRowActive]}
          onPress={() => setBulkForm({ ...bulkForm, applyType: !bulkForm.applyType })}
        >
          <View style={[styles.bulkCheckbox, bulkForm.applyType && styles.bulkCheckboxActive]}>
            {bulkForm.applyType && <Ionicons name="checkmark" size={12} color={COLORS.surface} />}
          </View>
          <AppText style={styles.bulkToggleLabel}>Promijeni tip</AppText>
        </TouchableOpacity>
        {bulkForm.applyType && (
          <View style={styles.typeSwitcherContainer}>
            <TouchableOpacity
              style={[styles.typeSwitcherOption, bulkForm.type === 'hive' && styles.typeSwitcherOptionActive, bulkForm.type === 'hive' && { borderColor: COLORS.accent.hive }]}
              onPress={() => setBulkForm({ ...bulkForm, type: 'hive' })}
            >
              <Ionicons name="grid-outline" size={18} color={bulkForm.type === 'hive' ? COLORS.accent.hive : COLORS.textMuted} />
              <AppText style={[styles.typeSwitcherLabel, { color: bulkForm.type === 'hive' ? COLORS.accent.hive : COLORS.textMuted }]}>Košnica</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeSwitcherOption, bulkForm.type === 'swarm' && styles.typeSwitcherOptionActive, bulkForm.type === 'swarm' && { borderColor: COLORS.accent.swarm }]}
              onPress={() => setBulkForm({ ...bulkForm, type: 'swarm' })}
            >
              <Ionicons name="cube-outline" size={18} color={bulkForm.type === 'swarm' ? COLORS.accent.swarm : COLORS.textMuted} />
              <AppText style={[styles.typeSwitcherLabel, { color: bulkForm.type === 'swarm' ? COLORS.accent.swarm : COLORS.textMuted }]}>Roj</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Health */}
        <TouchableOpacity
          style={[styles.bulkToggleRow, bulkForm.applyHealth && styles.bulkToggleRowActive]}
          onPress={() => setBulkForm({ ...bulkForm, applyHealth: !bulkForm.applyHealth })}
        >
          <View style={[styles.bulkCheckbox, bulkForm.applyHealth && styles.bulkCheckboxActive]}>
            {bulkForm.applyHealth && <Ionicons name="checkmark" size={12} color={COLORS.surface} />}
          </View>
          <AppText style={styles.bulkToggleLabel}>Zdravlje košnice</AppText>
        </TouchableOpacity>
        {bulkForm.applyHealth && (
          <View style={styles.typeSwitcherContainer}>
            <TouchableOpacity
              style={[styles.typeSwitcherOption, bulkForm.health === 'good' && styles.typeSwitcherOptionActive, bulkForm.health === 'good' && { borderColor: '#16A34A' }]}
              onPress={() => setBulkForm({ ...bulkForm, health: 'good' })}
            >
              <View style={[styles.legendSwatch, { borderColor: '#16A34A', backgroundColor: '#DCFCE7' }]} />
              <AppText style={[styles.typeSwitcherLabel, { color: bulkForm.health === 'good' ? '#16A34A' : COLORS.textMuted }]}>Dobro</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeSwitcherOption, bulkForm.health === 'bad' && styles.typeSwitcherOptionActive, bulkForm.health === 'bad' && { borderColor: '#DC2626' }]}
              onPress={() => setBulkForm({ ...bulkForm, health: 'bad' })}
            >
              <View style={[styles.legendSwatch, { borderColor: '#DC2626', backgroundColor: '#FEE2E2' }]} />
              <AppText style={[styles.typeSwitcherLabel, { color: bulkForm.health === 'bad' ? '#DC2626' : COLORS.textMuted }]}>Loše</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeSwitcherOption, bulkForm.health === 'warning' && styles.typeSwitcherOptionActive, bulkForm.health === 'warning' && { borderColor: '#D97706' }]}
              onPress={() => setBulkForm({ ...bulkForm, health: 'warning' as HiveHealth })}
            >
              <View style={[styles.legendSwatch, { borderColor: '#D97706', backgroundColor: '#FEF3C7' }]} />
              <AppText style={[styles.typeSwitcherLabel, { color: bulkForm.health === 'warning' ? '#D97706' : COLORS.textMuted }]}>Upozorenje</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Feeding date */}
        <TouchableOpacity
          style={[styles.bulkToggleRow, bulkForm.applyFeedingDate && styles.bulkToggleRowActive]}
          onPress={() => setBulkForm({ ...bulkForm, applyFeedingDate: !bulkForm.applyFeedingDate })}
        >
          <View style={[styles.bulkCheckbox, bulkForm.applyFeedingDate && styles.bulkCheckboxActive]}>
            {bulkForm.applyFeedingDate && <Ionicons name="checkmark" size={12} color={COLORS.surface} />}
          </View>
          <AppText style={styles.bulkToggleLabel}>Dodaj prihranu (košnice)</AppText>
        </TouchableOpacity>
        {bulkForm.applyFeedingDate && (
          <DatePicker
            label="Datum prihrane"
            value={bulkForm.feedingDate}
            onChange={(date) => setBulkForm({ ...bulkForm, feedingDate: date })}
          />
        )}

        {/* Harvest date */}
        <TouchableOpacity
          style={[styles.bulkToggleRow, bulkForm.applyHarvestDate && styles.bulkToggleRowActive]}
          onPress={() => setBulkForm({ ...bulkForm, applyHarvestDate: !bulkForm.applyHarvestDate })}
        >
          <View style={[styles.bulkCheckbox, bulkForm.applyHarvestDate && styles.bulkCheckboxActive]}>
            {bulkForm.applyHarvestDate && <Ionicons name="checkmark" size={12} color={COLORS.surface} />}
          </View>
          <AppText style={styles.bulkToggleLabel}>Dodaj vrcanje (košnice)</AppText>
        </TouchableOpacity>
        {bulkForm.applyHarvestDate && (
          <DatePicker
            label="Datum vrcanja"
            value={bulkForm.harvestDate}
            onChange={(date) => setBulkForm({ ...bulkForm, harvestDate: date })}
          />
        )}

        {/* Note */}
        <TouchableOpacity
          style={[styles.bulkToggleRow, bulkForm.applyNote && styles.bulkToggleRowActive]}
          onPress={() => setBulkForm({ ...bulkForm, applyNote: !bulkForm.applyNote })}
        >
          <View style={[styles.bulkCheckbox, bulkForm.applyNote && styles.bulkCheckboxActive]}>
            {bulkForm.applyNote && <Ionicons name="checkmark" size={12} color={COLORS.surface} />}
          </View>
          <AppText style={styles.bulkToggleLabel}>Dodaj bilješku</AppText>
        </TouchableOpacity>
        {bulkForm.applyNote && (
          <Input
            value={bulkForm.noteText}
            onChangeText={(text) => setBulkForm({ ...bulkForm, noteText: text })}
            placeholder="Tekst bilješke za sve odabrane..."
            multiline
            numberOfLines={3}
          />
        )}

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => setBulkModalVisible(false)}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Primijeni"
            onPress={handleBulkApply}
            loading={saving}
            disabled={!bulkForm.applyType && !bulkForm.applyHealth && !bulkForm.applyFeedingDate && !bulkForm.applyHarvestDate && !bulkForm.applyNote}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
      </Modal>

      {/* Edit Swarm Modal */}
      <Modal
        visible={editSwarmModalVisible}
        onClose={closeHiveEditModal}
        title={`Roj ${editingHive?.number || ""}`}
        hasUnsavedChanges={isHiveEditFormDirty}
      >
        {/* Type Switcher */}
        <View style={styles.typeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.typeSwitcherOption]}
            onPress={() => {
              if (!editingHive) return;
              // Switch which form is shown only — nothing is written to the DB
              // here, and every field stays exactly as-is since hiveEditForm is
              // shared between both forms. The type conversion (and everything
              // currently staged) is only persisted when "Sačuvaj" is pressed.
              // `editingHive` stays untouched so Cancel always discards back to
              // the real saved state.
              setEditSwarmModalVisible(false);
              setEditHiveModalVisible(true);
            }}
          >
            <Ionicons name="grid-outline" size={18} color={COLORS.textMuted} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.textMuted }]}>Košnica</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeSwitcherOption, styles.typeSwitcherOptionActive, { borderColor: COLORS.accent.swarm }]}
          >
            <Ionicons name="cube-outline" size={18} color={COLORS.accent.swarm} />
            <AppText style={[styles.typeSwitcherLabel, { color: COLORS.accent.swarm }]}>Roj</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Picker
            label="Zdravlje"
            value={hiveEditForm.health}
            options={[
              { label: "Dobro", value: "good" },
              { label: "Upozorenje", value: "warning" },
            ]}
            onValueChange={(value) =>
              setHiveEditForm({ ...hiveEditForm, health: value as HiveHealth })
            }
          />

          <Picker
            label="Status roja"
            value={hiveEditForm.swarmStatus}
            options={[
              { label: "Prazan", value: "empty" },
              { label: "Razvija se", value: "developing" },
              { label: "Spreman", value: "ready" },
              { label: "Prirodni", value: "natural" },
            ]}
            onValueChange={(value) =>
              setHiveEditForm({ ...hiveEditForm, swarmStatus: value as SwarmStatus })
            }
          />

          <DatePicker
            label="Datum početka razvoja"
            value={hiveEditForm.swarmStartDate}
            onChange={(date) =>
              setHiveEditForm({ ...hiveEditForm, swarmStartDate: date })
            }
          />

          <View style={styles.switchRow}>
            <AppText style={styles.switchLabel}>Aktivan</AppText>
            <TouchableOpacity
              style={[styles.switch, hiveEditForm.isActive && styles.switchActive]}
              onPress={() =>
                setHiveEditForm({ ...hiveEditForm, isActive: !hiveEditForm.isActive })
              }
            >
              <View style={[styles.switchThumb, hiveEditForm.isActive && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>

        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <AppText style={styles.notesLabel}>Bilješke</AppText>

          {/* Staged notes — persisted only when Sačuvaj is pressed */}
          {hiveEditForm.notes.length > 0 && (
            <View style={styles.notesList}>
              {hiveEditForm.notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteContent}>
                    <AppText style={styles.noteText}>{note.text}</AppText>
                    <AppText style={styles.noteDate}>
                      {formatDate(note.createdAt)}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteNote(note.id)}
                    style={styles.deleteNoteButton}
                  >
                    <Ionicons name="trash-outline" size={SPACING.xl} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add new note */}
          <View style={styles.addNoteContainer}>
            <Input
              value={hiveEditForm.newNote}
              onChangeText={(text) => setHiveEditForm({ ...hiveEditForm, newNote: text })}
              placeholder="Dodaj novu bilješku..."
              multiline
              numberOfLines={3}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button
              title="Dodaj"
              onPress={handleAddNote}
              disabled={!hiveEditForm.newNote.trim()}
              style={styles.addNoteButton}
            />
          </View>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={requestCloseHiveEditModal}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Sačuvaj"
            onPress={handleSaveSwarm}
            loading={saving}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
        <TouchableOpacity
          style={styles.deleteHiveButton}
          onPress={() => {
            if (!editingHive || !currentLocation) return;
            const rowId = editingHive.rowId;
            const hiveId = editingHive.id;
            const hiveNumber = editingHive.number;
            setEditSwarmModalVisible(false);
            resetHiveEditForm();
            setEditingHive(null);
            handleRemoveSlot(rowId, hiveId, hiveNumber, 'swarm');
          }}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          <AppText style={styles.deleteHiveButtonText}>Obriši roj</AppText>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  refreshButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    ...SHADOW.sm,
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
  locationSelector: {
    flexDirection: "row",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  locationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
    borderWidth: 2,
    borderColor: "transparent",
    ...SHADOW.md,
  },
  locationButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  locationNameActive: {
    color: COLORS.surface,
  },
  locationStats: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  locationStatsActive: {
    color: COLORS.surface,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  rowContainer: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    ...SHADOW.md,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
  },
  rowHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  rowName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  rowBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  rowBadgeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.surface,
  },
  quickStats: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  statDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statNumber: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  expandedContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  hivesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMedium,
  },
  rowActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  rowActionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
    color: COLORS.success,
  },
  emptySlot: {
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
    borderStyle: "dashed",
    backgroundColor: COLORS.surface,
  },
  emptySlotNumber: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  hiveBox: {
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  hiveNumber: {
    fontSize: FONT_SIZE.md,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  hiveNumberInactive: {
    color: COLORS.textMuted,
  },
  hiveBoxInactive: {
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  queenIcon: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  pollenIcon: {
    position: "absolute",
    top: 2,
    left: 2,
  },
  inactiveIcon: {
    position: "absolute",
    bottom: 2,
    left: 2,
  },
  addButton: {
    position: "absolute",
    bottom: SPACING.xxl,
    right: SPACING.xxl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.fab,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textPrimary,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
  sectionContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#835500",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMedium,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  switchLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  switch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.borderMedium,
    padding: 2,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    ...SHADOW.sm,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  notesSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#835500",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMedium,
  },
  notesList: {
    marginBottom: SPACING.md,
  },
  noteItem: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  noteContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  noteText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  noteDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  deleteNoteButton: {
    padding: SPACING.xs,
  },
  addNoteContainer: {
    gap: SPACING.sm,
  },
  addNoteButton: {
    marginTop: SPACING.sm,
  },
  feedingSection: {
    marginBottom: SPACING.md,
  },
  feedingLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  feedingList: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  feedingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  feedingDate: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  deleteFeedingButton: {
    padding: SPACING.xs,
  },
  scheduledRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.sm },
  scheduledInfo: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  scheduledLabel: { fontSize: FONT_SIZE.sm, fontWeight: "600", color: "#835500" },
  scheduledChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FEF3C7", paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: "#D97706",
  },
  scheduledChipText: { fontSize: FONT_SIZE.xs, fontWeight: "600", color: "#835500" },
  slotTypePickerContainer: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  slotTypeOption: {
    flex: 1,
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
    gap: SPACING.sm,
  },
  slotTypeLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  slotTypeDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  typeSwitcherContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  typeSwitcherOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.background,
  },
  typeSwitcherOptionActive: {
    backgroundColor: COLORS.surface,
  },
  typeSwitcherLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
  },
  deleteHiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deleteHiveButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.danger,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
    rowGap: SPACING.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  legendSwatch: {
    width: 13,
    height: 13,
    borderRadius: 3,
    borderWidth: 2.5,
    backgroundColor: COLORS.background,
  },
  legendLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  hiveBoxSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectionBannerLink: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectionCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  selectionApplyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  selectionApplyText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: COLORS.surface,
  },
  bulkToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.background,
  },
  bulkToggleRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  bulkCheckbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  bulkCheckboxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  bulkToggleLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
});
