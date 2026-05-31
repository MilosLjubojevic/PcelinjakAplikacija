import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  useWindowDimensions,
} from "react-native";
import AppText from "../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { QueenBox, QueenBoxRow, QueenBoxHealth, QueenBoxStatus } from "../types";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Picker, { PickerOption } from "../components/Picker";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import SearchBar from "../components/SearchBar";
import DatePicker from "../components/DatePicker";
import { GridSkeleton } from "../components/SkeletonLoader";
import { DraggableRowList } from "../components/DraggableRowList";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

const healthOptions: PickerOption[] = [
  { label: "Dobro", value: "good" },
  { label: "Zahtijeva Pažnju", value: "warning" },
];

const statusOptions: PickerOption[] = [
  { label: "Prazna", value: "empty" },
  { label: "U razvoju", value: "developing" },
  { label: "Zrela", value: "mature" },
];

export default function QueensScreen() {
  const { state, loading, addQueenBoxRow, updateQueenBoxRow, reorderQueenBoxRows, deleteQueenBoxRow, refreshData } = useApp();
  const { showToast } = useToast();
  const [expandedLocations, setExpandedLocations] = useState<string[]>(
    state.locations[0]?.id ? [state.locations[0].id] : []
  );
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [addRowModalVisible, setAddRowModalVisible] = useState(false);
  const [editBoxModalVisible, setEditBoxModalVisible] = useState(false);
  const [editingBox, setEditingBox] = useState<QueenBox | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    rowName: "",
    capacity: "",
    locationId: state.locations[0]?.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [editRowModalVisible, setEditRowModalVisible] = useState(false);
  const [editingRow, setEditingRow] = useState<QueenBoxRow | null>(null);
  const [editRowFormData, setEditRowFormData] = useState({ rowName: "", capacity: "" });
  const [addBoxModalVisible, setAddBoxModalVisible] = useState(false);
  const [pendingSlotRowId, setPendingSlotRowId] = useState<string | null>(null);
  const [pendingSlotNumber, setPendingSlotNumber] = useState<number | null>(null);
  const [newBoxNumber, setNewBoxNumber] = useState("");
  const [boxFormData, setBoxFormData] = useState({
    health: "good" as QueenBoxHealth,
    status: "empty" as QueenBoxStatus,
    displayNumber: "",
    startDate: null as Date | null,
    notes: "",
  });
  const [editModeRows, setEditModeRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDraggingRows, setIsDraggingRows] = useState(false);
  const [quickActionModalVisible, setQuickActionModalVisible] = useState(false);
  const [quickActionBox, setQuickActionBox] = useState<QueenBox | null>(null);
  const [quickActionRowId, setQuickActionRowId] = useState<string | null>(null);
  const [quickActionNotes, setQuickActionNotes] = useState("");
  const [customTimerModalVisible, setCustomTimerModalVisible] = useState(false);
  const [customTimerDays, setCustomTimerDays] = useState("");

  const { width: screenWidth } = useWindowDimensions();

  const queenBoxRows = useMemo(() => state.queenBoxRows || [], [state.queenBoxRows]);

  const usedBoxNumbers = useMemo(() => {
    const numbers = new Set<number>();
    for (const row of queenBoxRows) {
      for (const box of row.queenBoxes) {
        numbers.add(box.number);
      }
    }
    return numbers;
  }, [queenBoxRows]);

  const gridPadding = SPACING.lg + SPACING.md;
  const gridGap = SPACING.sm;
  const availableWidth = screenWidth - gridPadding * 2;
  const minBoxSize = 48;
  const maxBoxSize = 64;
  const columnsCount = Math.max(4, Math.floor((availableWidth + gridGap) / (minBoxSize + gridGap)));
  const boxSize = Math.min(maxBoxSize, Math.floor((availableWidth - (columnsCount - 1) * gridGap) / columnsCount));

  const locationOptions: PickerOption[] = useMemo(
    () => state.locations.map((loc) => ({ label: loc.name, value: loc.id })),
    [state.locations]
  );

  const autoMaturedRef = useRef(false);
  useEffect(() => {
    if (autoMaturedRef.current || loading) return;
    autoMaturedRef.current = true;
    const now = new Date();
    for (const row of queenBoxRows) {
      const maturedBoxes: QueenBox[] = [];
      for (const box of row.queenBoxes) {
        if (box.status !== "developing" || !box.maturityDate) continue;
        if (now >= new Date(box.maturityDate)) maturedBoxes.push(box);
      }
      if (maturedBoxes.length > 0) {
        const maturedIds = new Set(maturedBoxes.map((m) => m.id));
        const updatedBoxes = row.queenBoxes.map((b) =>
          maturedIds.has(b.id) ? { ...b, status: "mature" as const, updatedAt: new Date() } : b
        );
        updateQueenBoxRow(row.id, { queenBoxes: updatedBoxes });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const resetForm = () => setFormData({ rowName: "", capacity: "", locationId: state.locations[0]?.id || "" });

  const resetBoxForm = () => {
    setBoxFormData({ health: "good", status: "empty", displayNumber: "", startDate: null, notes: "" });
    setEditingBox(null);
    setEditingRowId(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddRowModalVisible(true);
  };

  const openEditBoxModal = (box: QueenBox, rowId: string) => {
    setEditingBox(box);
    setEditingRowId(rowId);
    setBoxFormData({
      health: box.health,
      status: box.status,
      displayNumber: box.number.toString(),
      startDate: box.startDate ? new Date(box.startDate) : null,
      notes: box.notes || "",
    });
    setEditBoxModalVisible(true);
  };

  const handleAddRow = async () => {
    if (!formData.rowName || !formData.capacity) return;
    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity < 1 || capacity > 200) {
      Alert.alert("Greška", "Unesite validan kapacitet (1-200).");
      return;
    }
    setSaving(true);
    const now = new Date();
    const newRowId = Crypto.randomUUID();
    const newRow: QueenBoxRow = {
      id: newRowId,
      name: formData.rowName,
      locationId: formData.locationId,
      capacity,
      queenBoxes: [],
      order: queenBoxRows.length,
      createdAt: now,
      updatedAt: now,
    };
    await addQueenBoxRow(newRow);
    setSaving(false);
    setExpandedLocations((prev) => prev.includes(formData.locationId) ? prev : [...prev, formData.locationId]);
    setExpandedRow(newRowId);
    setAddRowModalVisible(false);
    resetForm();
  };

  const handleEmptySlotPress = (rowId: string, slotNumber: number) => {
    setPendingSlotRowId(rowId);
    setPendingSlotNumber(slotNumber);
    setNewBoxNumber("");
    setAddBoxModalVisible(true);
  };

  const handleConfirmAddBox = async () => {
    if (!pendingSlotRowId || pendingSlotNumber === null || saving) return;
    const num = parseInt(newBoxNumber);
    if (isNaN(num) || num < 1 || num > 999) {
      Alert.alert("Greška", "Unesite broj od 1 do 999.");
      return;
    }
    if (usedBoxNumbers.has(num)) {
      Alert.alert("Greška", `Oplodnjak broj ${num} već postoji.`);
      return;
    }
    const rowId = pendingSlotRowId;
    const row = queenBoxRows.find((r) => r.id === rowId);
    if (!row) return;
    const boxesSnapshot = [...row.queenBoxes];
    setSaving(true);
    setAddBoxModalVisible(false);
    const now = new Date();
    const newBox: QueenBox = {
      id: Crypto.randomUUID(),
      number: num,
      rowId,
      health: "good",
      status: "developing",
      startDate: now,
      maturityDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    };
    updateQueenBoxRow(rowId, { queenBoxes: [...boxesSnapshot, newBox] });
    showToast(`Oplodnjak ${num} dodan`);
    setSaving(false);
    setPendingSlotRowId(null);
    setPendingSlotNumber(null);
    setNewBoxNumber("");
  };

  const handleSaveBox = async () => {
    if (!editingBox || !editingRowId) return;
    const row = queenBoxRows.find((r) => r.id === editingRowId);
    if (!row) return;
    setSaving(true);
    const startDate = boxFormData.startDate || undefined;
    const newNumber = parseInt(boxFormData.displayNumber);
    if (isNaN(newNumber) || newNumber < 1 || newNumber > 999) {
      Alert.alert("Greška", "Unesite broj od 1 do 999.");
      setSaving(false);
      return;
    }
    if (newNumber !== editingBox.number && usedBoxNumbers.has(newNumber)) {
      Alert.alert("Greška", `Oplodnjak broj ${newNumber} već postoji.`);
      setSaving(false);
      return;
    }
    const maturityDate = startDate
      ? new Date(startDate.getTime() + 25 * 24 * 60 * 60 * 1000)
      : undefined;
    const updatedBox: QueenBox = {
      ...editingBox,
      number: newNumber,
      health: boxFormData.health,
      status: boxFormData.status,
      startDate,
      maturityDate,
      notes: boxFormData.notes || undefined,
      updatedAt: new Date(),
    };
    const updatedBoxes = row.queenBoxes.map((b) => (b.id === editingBox.id ? updatedBox : b));
    await updateQueenBoxRow(editingRowId, { queenBoxes: updatedBoxes });
    setSaving(false);
    setEditBoxModalVisible(false);
    resetBoxForm();
  };

  const handleOpenEditRow = (row: QueenBoxRow) => {
    setEditingRow(row);
    setEditRowFormData({ rowName: row.name, capacity: row.capacity.toString() });
    setEditRowModalVisible(true);
  };

  const handleSaveRow = async () => {
    if (!editingRow) return;
    const capacity = parseInt(editRowFormData.capacity);
    if (isNaN(capacity) || capacity < 1 || capacity > 200) {
      Alert.alert("Greška", "Unesite validan kapacitet (1-200).");
      return;
    }
    setSaving(true);
    await updateQueenBoxRow(editingRow.id, { name: editRowFormData.rowName, capacity });
    setSaving(false);
    setEditRowModalVisible(false);
    setEditingRow(null);
  };

  const handleDeleteRow = (rowId: string, rowName: string) => {
    Alert.alert(
      "Obriši Red",
      `Da li ste sigurni da želite da obrišete "${rowName}" i sve oplodnjake u njemu?`,
      [
        { text: "Otkaži", style: "cancel" },
        { text: "Obriši", style: "destructive", onPress: () => deleteQueenBoxRow(rowId) },
      ]
    );
  };

  const handleRemoveSlot = (rowId: string, boxId: string, boxNumber: number) => {
    const row = queenBoxRows.find((r) => r.id === rowId);
    if (!row) return;
    Alert.alert(
      "Obriši Oplodnjak",
      `Da li ste sigurni da želite da obrišete oplodnjak ${boxNumber}?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const updatedBoxes = row.queenBoxes.filter((b) => b.id !== boxId);
            await updateQueenBoxRow(rowId, { queenBoxes: updatedBoxes });
          },
        },
      ]
    );
  };

  const handleOpenQuickActionModal = (rowId: string, box: QueenBox) => {
    setQuickActionBox(box);
    setQuickActionRowId(rowId);
    setQuickActionNotes(box.notes || "");
    setQuickActionModalVisible(true);
  };

  const handleSaveQuickNote = async () => {
    if (!quickActionBox || !quickActionRowId) return;
    const row = queenBoxRows.find((r) => r.id === quickActionRowId);
    if (!row) return;
    const updatedBox: QueenBox = { ...quickActionBox, notes: quickActionNotes || undefined, updatedAt: new Date() };
    await updateQueenBoxRow(quickActionRowId, {
      queenBoxes: row.queenBoxes.map((b) => (b.id === quickActionBox.id ? updatedBox : b)),
    });
    setQuickActionModalVisible(false);
    showToast(`Bilješka sačuvana za oplodnjak ${quickActionBox.number}`);
  };

  const handleResetTimer = async () => {
    if (!quickActionBox || !quickActionRowId) return;
    const row = queenBoxRows.find((r) => r.id === quickActionRowId);
    if (!row) return;
    const now = new Date();
    const updatedBox: QueenBox = {
      ...quickActionBox,
      status: "developing",
      startDate: now,
      maturityDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    };
    await updateQueenBoxRow(quickActionRowId, {
      queenBoxes: row.queenBoxes.map((b) => (b.id === quickActionBox.id ? updatedBox : b)),
    });
    setQuickActionModalVisible(false);
    showToast(`Tajmer resetovan za oplodnjak ${quickActionBox.number}`);
  };

  const handleSetCustomTimer = async () => {
    if (!quickActionBox || !quickActionRowId) return;
    const days = parseInt(customTimerDays);
    if (isNaN(days) || days < 1 || days > 365) {
      Alert.alert("Greška", "Unesite broj dana od 1 do 365.");
      return;
    }
    const row = queenBoxRows.find((r) => r.id === quickActionRowId);
    if (!row) return;
    const now = new Date();
    const updatedBox: QueenBox = {
      ...quickActionBox,
      status: "developing",
      startDate: now,
      maturityDate: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      updatedAt: now,
    };
    await updateQueenBoxRow(quickActionRowId, {
      queenBoxes: row.queenBoxes.map((b) => (b.id === quickActionBox.id ? updatedBox : b)),
    });
    setCustomTimerModalVisible(false);
    setCustomTimerDays("");
    setQuickActionModalVisible(false);
    showToast(`Tajmer postavljen na ${days} dana za oplodnjak ${quickActionBox.number}`);
  };

  const handleToggleUpitno = async () => {
    if (!quickActionBox || !quickActionRowId) return;
    const row = queenBoxRows.find((r) => r.id === quickActionRowId);
    if (!row) return;
    const newHealth: QueenBoxHealth = quickActionBox.health === "warning" ? "good" : "warning";
    const updatedBox: QueenBox = { ...quickActionBox, health: newHealth, updatedAt: new Date() };
    await updateQueenBoxRow(quickActionRowId, {
      queenBoxes: row.queenBoxes.map((b) => (b.id === quickActionBox.id ? updatedBox : b)),
    });
    setQuickActionModalVisible(false);
    showToast(
      newHealth === "warning"
        ? `Oplodnjak ${quickActionBox.number} označen kao Upitno`
        : `Oplodnjak ${quickActionBox.number} označen kao Dobro`
    );
  };

  const handleQuickDeleteBox = () => {
    if (!quickActionBox || !quickActionRowId) return;
    Alert.alert(
      "Obriši Oplodnjak",
      `Da li ste sigurni da želite da obrišete oplodnjak ${quickActionBox.number}?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const row = queenBoxRows.find((r) => r.id === quickActionRowId);
            if (!row) return;
            await updateQueenBoxRow(quickActionRowId, {
              queenBoxes: row.queenBoxes.filter((b) => b.id !== quickActionBox.id),
            });
            setQuickActionModalVisible(false);
          },
        },
      ]
    );
  };

  const toggleRow = (rowId: string) =>
    setExpandedRow((prev) => (prev === rowId ? null : rowId));

  const getHealthColor = (health: QueenBoxHealth) => {
    switch (health) {
      case "good": return COLORS.primary;
      case "warning": return COLORS.accent.swarm;
      default: return COLORS.textMuted;
    }
  };

  const getStatusColor = (status: QueenBoxStatus) => {
    switch (status) {
      case "empty": return COLORS.textMuted;
      case "developing": return COLORS.info;
      case "mature": return COLORS.success;
      default: return COLORS.textMuted;
    }
  };

  const calculateDaysUntilMature = (box: QueenBox): number | null => {
    if (box.status !== "developing" || !box.maturityDate) return null;
    const today = new Date();
    const daysLeft = Math.ceil((new Date(box.maturityDate).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  const getRowStats = (row: QueenBoxRow) => {
    const developing = row.queenBoxes.filter((b) => b.status === "developing").length;
    const mature = row.queenBoxes.filter((b) => b.status === "mature").length;
    const emptySlots = row.capacity - row.queenBoxes.length;
    return { developing, mature, total: row.capacity, filled: row.queenBoxes.length, emptySlots };
  };

  const handleRowsReorder = useCallback(
    async (reorderedRows: QueenBoxRow[]) => { await reorderQueenBoxRows(reorderedRows); },
    [reorderQueenBoxRows]
  );

  // Auto-expand the location + row containing a searched box number
  useEffect(() => {
    if (!searchQuery) return;
    const num = parseInt(searchQuery);
    const matchingLocationIds: string[] = [];
    let firstMatchingRowId: string | null = null;

    for (const location of state.locations) {
      const locationRows = queenBoxRows.filter((r) => r.locationId === location.id);
      const matchingRows = locationRows.filter(
        (row) =>
          row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (!isNaN(num) && row.queenBoxes.some((b) => b.number === num))
      );
      if (matchingRows.length > 0) {
        matchingLocationIds.push(location.id);
        if (!isNaN(num) && firstMatchingRowId === null) {
          const rowWithBox = matchingRows.find((r) => r.queenBoxes.some((b) => b.number === num));
          if (rowWithBox) firstMatchingRowId = rowWithBox.id;
        }
      }
    }

    setExpandedLocations(matchingLocationIds);
    if (firstMatchingRowId) setExpandedRow(firstMatchingRowId);
  }, [searchQuery, queenBoxRows, state.locations]);

  if (loading) {
    return <View style={styles.container}><GridSkeleton rows={3} cols={5} /></View>;
  }

  const totalDeveloping = queenBoxRows.reduce((t, r) => t + r.queenBoxes.filter((b) => b.status === "developing").length, 0);
  const totalMature = queenBoxRows.reduce((t, r) => t + r.queenBoxes.filter((b) => b.status === "mature").length, 0);
  const totalBoxes = queenBoxRows.reduce((t, r) => t + r.queenBoxes.length, 0);

  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View>
          <AppText style={styles.pageTitle}>Matice i oplodnjaci</AppText>
          <AppText style={styles.pageSubtitle}>Pregled vaših oplodnjaka</AppText>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refreshData} disabled={loading} accessibilityLabel="Osviježi">
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <AppText style={styles.statsText}>
          Ukupno: <AppText style={styles.statsCount}>{totalBoxes}</AppText> oplodnjaka
        </AppText>
        <View style={styles.quickStatDots}>
          <View style={styles.statPill}>
            <Ionicons name="time-outline" size={12} color={COLORS.info} />
            <AppText style={styles.statPillText} maxFontSizeMultiplier={1}>{totalDeveloping}</AppText>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="checkmark-circle-outline" size={12} color={COLORS.success} />
            <AppText style={styles.statPillText} maxFontSizeMultiplier={1}>{totalMature}</AppText>
          </View>
        </View>
      </View>

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Pretraži redove/oplodnjake..." />

      {/* Legend */}
      <View style={styles.legendWrap}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { borderColor: COLORS.primary }]} /><AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>U razvoju</AppText></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { borderColor: COLORS.success, backgroundColor: COLORS.successLight }]} /><AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Zrela</AppText></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { borderColor: COLORS.borderMedium, backgroundColor: COLORS.border, opacity: 0.7 }]} /><AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Prazna</AppText></View>
        <View style={styles.legendItem}><View style={styles.legendCounterSwatch}><AppText style={styles.legendCounterText} maxFontSizeMultiplier={1}>15d</AppText></View><AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Dani do zrelosti</AppText></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { borderColor: COLORS.accent.swarm, backgroundColor: COLORS.accent.swarmLight }]} /><AppText style={styles.legendLabel} maxFontSizeMultiplier={1} numberOfLines={1}>Upitno</AppText></View>
      </View>

      {/* Locations Accordion */}
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} scrollEnabled={!isDraggingRows}>
        {state.locations.map((location) => {
          const isExpanded = expandedLocations.includes(location.id);
          const locationRows = queenBoxRows.filter((r) => r.locationId === location.id);
          const searchedRows = searchQuery
            ? locationRows.filter(
                (row) =>
                  row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  row.queenBoxes.some((b) => b.number === parseInt(searchQuery))
              )
            : locationRows;
          const locFilled = locationRows.reduce((s, r) => s + r.queenBoxes.length, 0);

          // Hide this location entirely if search is active and nothing matches here
          if (searchQuery && searchedRows.length === 0) return null;

          return (
            <View key={location.id} style={styles.locationCard}>
              {/* Location Header */}
              <TouchableOpacity
                style={styles.locationHeader}
                onPress={() => {
                  const isClosing = expandedLocations.includes(location.id);
                  setExpandedLocations((prev) =>
                    isClosing ? prev.filter((id) => id !== location.id) : [...prev, location.id]
                  );
                  if (isClosing) {
                    const rowBelongsHere = locationRows.some((r) => r.id === expandedRow);
                    if (rowBelongsHere) setExpandedRow(null);
                  }
                }}
              >
                <View style={[styles.locationIconBg, isExpanded && styles.locationIconBgActive]}>
                  <Ionicons name={location.icon as any} size={20} color={isExpanded ? COLORS.surface : COLORS.primary} />
                </View>
                <View style={styles.locationInfo}>
                  <AppText style={styles.locationName}>{location.name}</AppText>
                  <AppText style={styles.locationMeta}>{locationRows.length} Redova  •  {locFilled} Oplodnjaka</AppText>
                </View>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Location Body */}
              {isExpanded && (
                <View style={styles.locationBody}>
                  {searchedRows.length === 0 ? (
                    <EmptyState
                      icon="star-outline"
                      title={searchQuery ? "Nema rezultata" : "Nema redova"}
                      message={searchQuery ? "Pokušajte drugi pojam za pretragu" : "Dodajte prvi red oplodnjaka"}
                      actionLabel={searchQuery ? undefined : "Dodaj Red"}
                      onAction={searchQuery ? undefined : openAddModal}
                    />
                  ) : (
                    <DraggableRowList
                      rows={searchedRows}
                      disabled={!!searchQuery}
                      onReorder={handleRowsReorder}
                      onDragStart={() => setIsDraggingRows(true)}
                      onDragEnd={() => setIsDraggingRows(false)}
                      renderRow={(row) => {
                        const isRowExpanded = expandedRow === row.id;
                        const stats = getRowStats(row);

                        return (
                          <View style={styles.rowContainer}>
                            {/* Row Header */}
                            <TouchableOpacity style={styles.rowHeader} onPress={() => toggleRow(row.id)}>
                              <Ionicons name={isRowExpanded ? "chevron-down" : "chevron-forward"} size={14} color={COLORS.textMuted} />
                              <AppText style={styles.rowLabel} numberOfLines={1}>{row.name.toUpperCase()}</AppText>
                              <View style={styles.rowHeaderRight}>
                                <View style={styles.rowStatDots}>
                                  <View style={[styles.rowDot, { backgroundColor: COLORS.borderMedium }]} />
                                  <AppText style={styles.rowDotText}>{stats.emptySlots}</AppText>
                                  <View style={[styles.rowDot, { backgroundColor: COLORS.info }]} />
                                  <AppText style={styles.rowDotText}>{stats.developing}</AppText>
                                  <View style={[styles.rowDot, { backgroundColor: COLORS.success }]} />
                                  <AppText style={styles.rowDotText}>{stats.mature}</AppText>
                                </View>
                                <View style={styles.rowCountBadge}>
                                  <AppText style={styles.rowCountText} maxFontSizeMultiplier={1} numberOfLines={1}>{stats.filled}/{stats.total}</AppText>
                                </View>
                              </View>
                            </TouchableOpacity>

                            {isRowExpanded && (
                              <View style={styles.rowContent}>
                                {/* Box Grid */}
                                <View style={styles.boxesGrid}>
                                  {row.queenBoxes.map((box) => {
                                    const daysUntilMature = calculateDaysUntilMature(box);
                                    const searchNum = parseInt(searchQuery);
                                    const isSearchMatch = searchQuery !== "" && !isNaN(searchNum) && box.number === searchNum;
                                    return (
                                      <TouchableOpacity
                                        key={box.id}
                                        style={[
                                          styles.queenBox,
                                          { width: boxSize, height: boxSize, borderRadius: boxSize * 0.18 },
                                          { borderColor: box.status === "mature" ? COLORS.success : getHealthColor(box.health) },
                                          box.status === "empty" && styles.queenBoxEmpty,
                                          box.status === "mature" && styles.queenBoxMature,
                                          box.health === "warning" && box.status !== "mature" && styles.queenBoxUpitno,
                                          editModeRows.includes(row.id) && styles.queenBoxEditMode,
                                          isSearchMatch && styles.queenBoxSearchMatch,
                                        ]}
                                        onPress={() =>
                                          editModeRows.includes(row.id)
                                            ? openEditBoxModal(box, row.id)
                                            : handleOpenQuickActionModal(row.id, box)
                                        }
                                        onLongPress={() => openEditBoxModal(box, row.id)}
                                        accessibilityLabel={`Oplodnjak ${box.number}, ${box.status === "empty" ? "prazan" : box.status === "developing" ? "u razvoju" : "zreo"}`}
                                        accessibilityHint="Pritisni za promjenu statusa, dugo drži za izmjenu"
                                      >
                                        <AppText style={[styles.boxNumber, isSearchMatch && { color: COLORS.surface }]} allowFontScaling={false}>{box.number}</AppText>
                                        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(box.status) }]}>
                                          {box.status === "developing" && <Ionicons name="time" size={8} color={COLORS.surface} />}
                                          {box.status === "mature" && <Ionicons name="checkmark" size={8} color={COLORS.surface} />}
                                        </View>
                                        {daysUntilMature !== null && (
                                          <View style={styles.daysCounter}>
                                            <AppText style={styles.daysText} allowFontScaling={false}>{daysUntilMature}d</AppText>
                                          </View>
                                        )}
                                        {box.status === "mature" && (
                                          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={styles.matureIcon} />
                                        )}
                                      </TouchableOpacity>
                                    );
                                  })}
                                  {/* Empty add slots */}
                                  {row.queenBoxes.length < row.capacity &&
                                    Array.from({ length: row.capacity - row.queenBoxes.length }, (_, i) => (
                                      <TouchableOpacity
                                        key={`empty-${i}`}
                                        style={[styles.queenBox, styles.emptySlot, { width: boxSize, height: boxSize, borderRadius: boxSize * 0.18 }]}
                                        onPress={() => handleEmptySlotPress(row.id, i + 1)}
                                        accessibilityLabel="Prazan slot"
                                        accessibilityHint="Pritisni da dodaš oplodnjak"
                                      >
                                        <Ionicons name="add" size={10} color={COLORS.textMuted} />
                                      </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Row Actions */}
                                <View style={styles.rowActions}>
                                  <TouchableOpacity style={styles.rowActionBtn} onPress={() => handleOpenEditRow(row)}>
                                    <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                                    <AppText style={[styles.rowActionText, { color: COLORS.primary }]}>Uredi red</AppText>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.rowActionBtn}
                                    onPress={() =>
                                      setEditModeRows((prev) =>
                                        prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                                      )
                                    }
                                  >
                                    <Ionicons
                                      name={editModeRows.includes(row.id) ? "checkmark-circle-outline" : "pencil-outline"}
                                      size={16}
                                      color={editModeRows.includes(row.id) ? COLORS.success : COLORS.textMuted}
                                    />
                                    <AppText style={[styles.rowActionText, { color: editModeRows.includes(row.id) ? COLORS.success : COLORS.textMuted }]}>
                                      {editModeRows.includes(row.id) ? "Gotovo" : "Izmjeni"}
                                    </AppText>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={styles.rowActionBtn} onPress={() => handleDeleteRow(row.id, row.name)}>
                                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                                    <AppText style={[styles.rowActionText, { color: COLORS.danger }]}>Obriši red</AppText>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      }}
                    />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Quick Action Modal */}
      <Modal
        visible={quickActionModalVisible}
        onClose={() => setQuickActionModalVisible(false)}
        title={`Oplodnjak ${quickActionBox?.number ?? ""}`}
      >
        <View style={styles.quickActionList}>
          <TouchableOpacity style={styles.quickActionItem} onPress={handleResetTimer}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="refresh-circle-outline" size={24} color={COLORS.info} />
            </View>
            <View style={styles.quickActionTextWrap}>
              <AppText style={styles.quickActionTitle}>Resetuj tajmer</AppText>
              <AppText style={styles.quickActionDesc}>Počinje tajmer od 25 dana od danas</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => { setCustomTimerDays(""); setCustomTimerModalVisible(true); }}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="timer-outline" size={24} color={COLORS.info} />
            </View>
            <View style={styles.quickActionTextWrap}>
              <AppText style={styles.quickActionTitle}>Prilagođeni tajmer</AppText>
              <AppText style={styles.quickActionDesc}>Postavi tajmer na željeni broj dana</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem} onPress={handleToggleUpitno}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.accent.swarmLight }]}>
              <Ionicons name="help-circle-outline" size={24} color={COLORS.accent.swarm} />
            </View>
            <View style={styles.quickActionTextWrap}>
              <AppText style={styles.quickActionTitle}>
                {quickActionBox?.health === "warning" ? "Ukloni oznaku Upitno" : "Označi kao Upitno"}
              </AppText>
              <AppText style={styles.quickActionDesc}>
                {quickActionBox?.health === "warning" ? "Vrati status na Dobro" : "Označi oplodnjak kao upitan"}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickActionItem, styles.quickActionItemDanger]} onPress={handleQuickDeleteBox}>
            <View style={[styles.quickActionIcon, { backgroundColor: COLORS.dangerLight }]}>
              <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
            </View>
            <View style={styles.quickActionTextWrap}>
              <AppText style={[styles.quickActionTitle, { color: COLORS.danger }]}>Obriši oplodnjak</AppText>
              <AppText style={styles.quickActionDesc}>Trajno ukloni ovaj oplodnjak</AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.quickActionDivider} />
        <Input
          label="Bilješka"
          value={quickActionNotes}
          onChangeText={setQuickActionNotes}
          placeholder="Dodaj bilješku za ovaj oplodnjak..."
          multiline
          numberOfLines={3}
        />
        <View style={styles.modalButtons}>
          <Button title="Zatvori" onPress={() => setQuickActionModalVisible(false)} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button title="Sačuvaj bilješku" onPress={handleSaveQuickNote} style={{ flex: 1, marginLeft: SPACING.sm }} />
        </View>
      </Modal>

      {/* Edit Row Modal */}
      <Modal
        visible={editRowModalVisible}
        onClose={() => { setEditRowModalVisible(false); setEditingRow(null); }}
        title="Uredi Red"
        hasUnsavedChanges={
          editingRow !== null &&
          (editRowFormData.rowName !== editingRow.name || editRowFormData.capacity !== editingRow.capacity.toString())
        }
      >
        <Input label="Naziv reda" value={editRowFormData.rowName} onChangeText={(text) => setEditRowFormData({ ...editRowFormData, rowName: text })} placeholder="Npr. Red 1, Red A..." />
        <Input label="Kapacitet (broj mjesta)" value={editRowFormData.capacity} onChangeText={(text) => setEditRowFormData({ ...editRowFormData, capacity: text })} placeholder="Npr. 30" keyboardType="numeric" />
        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setEditRowModalVisible(false); setEditingRow(null); }} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button title="Sačuvaj" onPress={handleSaveRow} disabled={!editRowFormData.rowName || !editRowFormData.capacity} loading={saving} style={{ flex: 1, marginLeft: SPACING.sm }} />
        </View>
      </Modal>

      {/* Add Row Modal */}
      <Modal
        visible={addRowModalVisible}
        onClose={() => { setAddRowModalVisible(false); resetForm(); }}
        title="Dodaj Novi Red"
        hasUnsavedChanges={formData.rowName !== "" || formData.capacity !== ""}
      >
        <Input label="Naziv reda" value={formData.rowName} onChangeText={(text) => setFormData({ ...formData, rowName: text })} placeholder="Npr. Red 1, Red A..." />
        <Picker label="Lokacija" value={formData.locationId} options={locationOptions} onValueChange={(value) => setFormData({ ...formData, locationId: value as string })} />
        <Input label="Kapacitet (broj mjesta)" value={formData.capacity} onChangeText={(text) => setFormData({ ...formData, capacity: text })} placeholder="Npr. 30" keyboardType="numeric" />
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <AppText style={styles.infoText}>
            Red će imati {formData.capacity ? parseInt(formData.capacity) || 0 : 0} praznih mjesta. Dodajte oplodnjake pritiskom na prazne slotove.
          </AppText>
        </View>
        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setAddRowModalVisible(false); resetForm(); }} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button title="Dodaj Red" onPress={handleAddRow} disabled={!formData.rowName || !formData.capacity} loading={saving} style={{ flex: 1, marginLeft: SPACING.sm }} />
        </View>
      </Modal>

      {/* Add Box Number Modal */}
      <Modal
        visible={addBoxModalVisible}
        onClose={() => { setAddBoxModalVisible(false); setPendingSlotRowId(null); setPendingSlotNumber(null); setNewBoxNumber(""); }}
        title="Dodaj Oplodnjak"
      >
        <Input label="Broj oplodnjaka (1-999)" value={newBoxNumber} onChangeText={setNewBoxNumber} placeholder="Npr. 42" keyboardType="numeric" />
        {newBoxNumber !== "" && usedBoxNumbers.has(parseInt(newBoxNumber)) && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={SPACING.xl} color={COLORS.danger} />
            <AppText style={styles.errorText}>Oplodnjak broj {newBoxNumber} već postoji.</AppText>
          </View>
        )}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={SPACING.xl} color={COLORS.primary} />
          <AppText style={styles.infoText}>Tajmer od 25 dana će automatski početi.</AppText>
        </View>
        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setAddBoxModalVisible(false); setPendingSlotRowId(null); setPendingSlotNumber(null); setNewBoxNumber(""); }} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button title="Dodaj" onPress={handleConfirmAddBox} disabled={!newBoxNumber || usedBoxNumbers.has(parseInt(newBoxNumber)) || saving} loading={saving} style={{ flex: 1, marginLeft: SPACING.sm }} />
        </View>
      </Modal>

      {/* Custom Timer Modal */}
      <Modal
        visible={customTimerModalVisible}
        onClose={() => { setCustomTimerModalVisible(false); setCustomTimerDays(""); }}
        title="Prilagođeni tajmer"
      >
        <Input
          label="Broj dana do zrelosti"
          value={customTimerDays}
          onChangeText={setCustomTimerDays}
          placeholder="Npr. 21"
          keyboardType="numeric"
        />
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={SPACING.xl} color={COLORS.primary} />
          <AppText style={styles.infoText}>
            {customTimerDays && !isNaN(parseInt(customTimerDays)) && parseInt(customTimerDays) > 0
              ? `Matica će biti zrela za ${parseInt(customTimerDays)} dana od danas.`
              : "Unesite broj dana od 1 do 365."}
          </AppText>
        </View>
        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setCustomTimerModalVisible(false); setCustomTimerDays(""); }} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button
            title="Postavi"
            onPress={handleSetCustomTimer}
            disabled={!customTimerDays || isNaN(parseInt(customTimerDays)) || parseInt(customTimerDays) < 1}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
      </Modal>

      {/* Edit Box Modal */}
      <Modal
        visible={editBoxModalVisible}
        onClose={() => { setEditBoxModalVisible(false); resetBoxForm(); }}
        title={`Oplodnjak ${editingBox?.number || ""}`}
        hasUnsavedChanges={boxFormData.notes !== "" || boxFormData.startDate !== null}
      >
        <View style={styles.sectionContainer}>
          <AppText style={styles.sectionTitle}>Informacije</AppText>
          <Input label="Broj oplodnjaka" value={boxFormData.displayNumber} onChangeText={(text) => setBoxFormData({ ...boxFormData, displayNumber: text })} placeholder="Npr. 125" keyboardType="numeric" />
          <Picker label="Status oplodnjaka" value={boxFormData.status} options={statusOptions} onValueChange={(value) => setBoxFormData({ ...boxFormData, status: value as QueenBoxStatus })} />
          <Picker label="Zdravlje" value={boxFormData.health} options={healthOptions} onValueChange={(value) => setBoxFormData({ ...boxFormData, health: value as QueenBoxHealth })} />
        </View>
        <View style={styles.sectionContainer}>
          <AppText style={styles.sectionTitle}>Datumi</AppText>
          <DatePicker label="Datum početka (kada je matičnjak postavljen)" value={boxFormData.startDate} onChange={(date) => setBoxFormData({ ...boxFormData, startDate: date })} placeholder="Izaberite datum" />
          {boxFormData.startDate && (
            <View style={styles.maturityInfo}>
              <Ionicons name="time-outline" size={18} color={COLORS.info} />
              <AppText style={styles.maturityText}>
                Matica će biti zrela:{" "}
                {formatDate(new Date(boxFormData.startDate.getTime() + 25 * 24 * 60 * 60 * 1000))}
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.sectionContainer}>
          <Input label="Bilješke (opciono)" value={boxFormData.notes} onChangeText={(text) => setBoxFormData({ ...boxFormData, notes: text })} placeholder="Dodatne informacije..." multiline numberOfLines={3} />
        </View>
        {editingBox && editingRowId && (
          <TouchableOpacity
            style={styles.deleteBoxButton}
            onPress={() => { setEditBoxModalVisible(false); resetBoxForm(); handleRemoveSlot(editingRowId, editingBox.id, editingBox.number); }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <AppText style={styles.deleteBoxText}>Obriši oplodnjak</AppText>
          </TouchableOpacity>
        )}
        <View style={styles.modalButtons}>
          <Button title="Otkaži" onPress={() => { setEditBoxModalVisible(false); resetBoxForm(); }} variant="secondary" style={{ flex: 1, marginRight: SPACING.sm }} />
          <Button title="Sačuvaj" onPress={handleSaveBox} loading={saving} style={{ flex: 1, marginLeft: SPACING.sm }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ─── Page Header ──────────────────────────────────────────────────
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  pageTitle: { fontSize: FONT_SIZE.xl, fontWeight: "700", color: COLORS.textPrimary, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: "center", justifyContent: "center",
    ...SHADOW.sm,
  },

  // ─── Stats Row ────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  statsText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  statsCount: { fontWeight: "700", color: COLORS.textPrimary },
  quickStatDots: { flexDirection: "row", gap: SPACING.sm },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.borderMedium,
  },
  statPillText: { fontSize: FONT_SIZE.xs, fontWeight: "600", color: COLORS.textSecondary },

  // ─── Legend ───────────────────────────────────────────────────────
  legendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    rowGap: 6,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 2 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 2.5, backgroundColor: COLORS.background },
  legendLabel: { fontSize: 11, color: COLORS.textMuted },
  legendCounterSwatch: { backgroundColor: COLORS.info, paddingHorizontal: 4, paddingVertical: 1, borderRadius: SPACING.xs },
  legendCounterText: { fontSize: 11, fontWeight: "bold", color: COLORS.surface },

  // ─── Scroll + Location Cards ──────────────────────────────────────
  scrollView: { flex: 1 },
  locationCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    ...SHADOW.md,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  locationIconBg: {
    width: 36, height: 36, borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: COLORS.borderMedium,
  },
  locationIconBgActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  locationInfo: { flex: 1 },
  locationName: { fontSize: FONT_SIZE.md, fontWeight: "700", color: COLORS.textPrimary },
  locationMeta: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 },
  locationBody: { borderTopWidth: 1, borderTopColor: COLORS.borderMedium },

  // ─── Rows ─────────────────────────────────────────────────────────
  rowContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    overflow: "hidden",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  rowLabel: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  rowHeaderRight: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  rowStatDots: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowDotText: { fontSize: FONT_SIZE.xs, fontWeight: "600", color: COLORS.textMuted, marginRight: 2 },
  rowCountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  rowCountText: { fontSize: FONT_SIZE.xs, fontWeight: "600", color: COLORS.surface },
  rowContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },

  // ─── Box Grid ─────────────────────────────────────────────────────
  boxesGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.sm },
  queenBox: {
    borderWidth: 3,
    borderStyle: "solid",
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  queenBoxEmpty: { backgroundColor: COLORS.border, opacity: 0.7 },
  queenBoxMature: { backgroundColor: COLORS.successLight },
  emptySlot: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.background,
    opacity: 0.6,
  },
  boxNumber: { fontSize: FONT_SIZE.md, fontWeight: "bold", color: COLORS.textPrimary },
  statusIndicator: {
    position: "absolute", top: 3, right: 3,
    width: SPACING.md, height: SPACING.md,
    borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  daysCounter: {
    position: "absolute", bottom: 2, left: 2,
    backgroundColor: COLORS.info,
    paddingHorizontal: SPACING.xs, paddingVertical: 1,
    borderRadius: SPACING.xs,
  },
  daysText: { fontSize: FONT_SIZE.xs, fontWeight: "bold", color: COLORS.surface },
  matureIcon: { position: "absolute", bottom: 2, right: 2 },
  queenBoxEditMode: { opacity: 0.85, borderStyle: "dashed" },
  queenBoxUpitno: { backgroundColor: COLORS.accent.swarmLight },
  queenBoxSearchMatch: { backgroundColor: "#FF1493", borderColor: "#FF1493" },

  // ─── Row Actions ──────────────────────────────────────────────────
  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMedium,
    gap: SPACING.xs,
  },
  rowActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  rowActionText: { fontSize: FONT_SIZE.xs, fontWeight: "600" },

  // ─── FAB ──────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: SPACING.xxl, right: SPACING.xxl,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    ...SHADOW.fab,
  },

  // ─── Modals ───────────────────────────────────────────────────────
  infoBox: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.background,
    padding: SPACING.md, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.background,
    padding: SPACING.md, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.danger,
    marginBottom: SPACING.lg,
  },
  infoText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary },
  errorText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.danger },
  modalButtons: { flexDirection: "row", marginTop: SPACING.sm },
  sectionContainer: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMedium,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md, fontWeight: "bold", color: COLORS.textPrimary,
    marginBottom: SPACING.lg, textTransform: "uppercase", letterSpacing: 0.5,
  },
  maturityInfo: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.infoLight,
    padding: 10, borderRadius: RADIUS.sm,
    marginTop: SPACING.sm, marginBottom: SPACING.md,
  },
  maturityText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.info, fontWeight: "500" },
  deleteBoxButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: SPACING.sm, padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md,
  },
  deleteBoxText: { fontSize: FONT_SIZE.md, color: COLORS.danger, fontWeight: "500" },
  quickActionList: { gap: SPACING.sm, marginBottom: SPACING.sm },
  quickActionItem: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.borderMedium,
  },
  quickActionItemDanger: { borderColor: COLORS.dangerLight },
  quickActionIcon: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  quickActionTextWrap: { flex: 1 },
  quickActionTitle: { fontSize: FONT_SIZE.md, fontWeight: "600", color: COLORS.textPrimary },
  quickActionDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: 2 },
  quickActionDivider: { height: 1, backgroundColor: COLORS.borderMedium, marginVertical: SPACING.md },
});
