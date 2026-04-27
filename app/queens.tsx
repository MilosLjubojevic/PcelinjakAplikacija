import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  useWindowDimensions,
} from "react-native";
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
  const [selectedLocationId, setSelectedLocationId] = useState(state.locations[0]?.id || "");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
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

  const { width: screenWidth } = useWindowDimensions();

  const queenBoxRows = useMemo(() => state.queenBoxRows || [], [state.queenBoxRows]);
  const filteredRows = queenBoxRows.filter((row) => row.locationId === selectedLocationId);

  // All used queen box numbers across all rows (for uniqueness validation)
  const usedBoxNumbers = useMemo(() => {
    const numbers = new Set<number>();
    for (const row of queenBoxRows) {
      for (const box of row.queenBoxes) {
        numbers.add(box.number);
      }
    }
    return numbers;
  }, [queenBoxRows]);

  // Responsive box sizing: fill available width evenly
  const gridPadding = SPACING.lg + SPACING.md; // container margin + expanded content padding
  const gridGap = SPACING.sm;
  const availableWidth = screenWidth - gridPadding * 2;
  const minBoxSize = 48;
  const maxBoxSize = 64;
  const columnsCount = Math.max(4, Math.floor((availableWidth + gridGap) / (minBoxSize + gridGap)));
  const boxSize = Math.min(maxBoxSize, Math.floor((availableWidth - (columnsCount - 1) * gridGap) / columnsCount));

  // Build location picker options from state.locations
  const locationOptions: PickerOption[] = useMemo(
    () => state.locations.map((loc) => ({ label: loc.name, value: loc.id })),
    [state.locations]
  );

  // Auto-mature boxes that have passed 25 days — runs once on mount only
  const autoMaturedRef = useRef(false);
  useEffect(() => {
    if (autoMaturedRef.current || loading) return;
    autoMaturedRef.current = true;

    const now = new Date();
    for (const row of queenBoxRows) {
      const maturedBoxes: QueenBox[] = [];
      for (const box of row.queenBoxes) {
        if (box.status !== "developing" || !box.startDate) continue;
        const start = new Date(box.startDate);
        const elapsed = (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
        if (elapsed >= 25) {
          maturedBoxes.push(box);
        }
      }
      if (maturedBoxes.length > 0) {
        const maturedIds = new Set(maturedBoxes.map(m => m.id));
        const updatedBoxes = row.queenBoxes.map((b) =>
          maturedIds.has(b.id) ? { ...b, status: "mature" as const, updatedAt: new Date() } : b
        );
        updateQueenBoxRow(row.id, { queenBoxes: updatedBoxes });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const resetForm = () => {
    setFormData({
      rowName: "",
      capacity: "",
      locationId: selectedLocationId,
    });
  };

  const resetBoxForm = () => {
    setBoxFormData({
      health: "good",
      status: "empty",
      displayNumber: "",
      startDate: null,
      notes: "",
    });
    setEditingBox(null);
    setEditingRowId(null);
  };

  const openAddModal = () => {
    resetForm();
    setFormData((prev) => ({ ...prev, locationId: selectedLocationId }));
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
    if (!formData.rowName || !formData.capacity) {
      return;
    }

    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity < 1 || capacity > 200) {
      Alert.alert("Greška", "Unesite validan kapacitet (1-200).");
      return;
    }
    setSaving(true);

    const now = new Date();
    const newRowId = Crypto.randomUUID();

    // Create empty row with capacity — no pre-created boxes
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
    setExpandedRows([newRowId]);
    setAddRowModalVisible(false);
    resetForm();
  };

  // Open number input modal for adding a queen box to an empty slot
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

    // Close modal and capture data before async work
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

    await updateQueenBoxRow(rowId, {
      queenBoxes: [...boxesSnapshot, newBox],
    });

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

    // Calculate maturity date (25 days from start)
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

    // Update the box in the row
    const updatedBoxes = row.queenBoxes.map((b) =>
      b.id === editingBox.id ? updatedBox : b
    );

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
        {
          text: "Obriši",
          style: "destructive",
          onPress: () => deleteQueenBoxRow(rowId),
        },
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

  // Quick status toggle: developing -> mature -> remove (1st tap starts timer via slot press)
  const handleQuickStatusToggle = async (rowId: string, box: QueenBox) => {
    const row = queenBoxRows.find((r) => r.id === rowId);
    if (!row) return;

    if (box.status === "developing") {
      // 2nd tap: mark as mature/ready
      const updatedBox: QueenBox = {
        ...box,
        status: "mature",
        updatedAt: new Date(),
      };
      const updatedBoxes = row.queenBoxes.map((b) =>
        b.id === box.id ? updatedBox : b
      );
      await updateQueenBoxRow(rowId, { queenBoxes: updatedBoxes });
    } else if (box.status === "mature") {
      // 3rd tap: remove the box entirely
      const updatedBoxes = row.queenBoxes.filter((b) => b.id !== box.id);
      await updateQueenBoxRow(rowId, { queenBoxes: updatedBoxes });
    }
  };

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
  };

  const getHealthColor = (health: QueenBoxHealth) => {
    switch (health) {
      case "good":
        return COLORS.primary;
      case "warning":
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusColor = (status: QueenBoxStatus) => {
    switch (status) {
      case "empty":
        return COLORS.textMuted;
      case "developing":
        return COLORS.info;
      case "mature":
        return COLORS.success;
      default:
        return COLORS.textMuted;
    }
  };

  const calculateDaysUntilMature = (box: QueenBox): number | null => {
    if (box.status !== "developing" || !box.startDate) return null;
    const startDate = new Date(box.startDate);
    const maturityDate = new Date(startDate.getTime() + 25 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const daysLeft = Math.ceil((maturityDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  const getRowStats = (row: QueenBoxRow) => {
    const empty = row.queenBoxes.filter((b) => b.status === "empty").length;
    const developing = row.queenBoxes.filter((b) => b.status === "developing").length;
    const mature = row.queenBoxes.filter((b) => b.status === "mature").length;
    const emptySlots = row.capacity - row.queenBoxes.length;
    return { empty, developing, mature, total: row.capacity, filled: row.queenBoxes.length, emptySlots };
  };

  const getLocationStats = (locationId: string) => {
    const rows = queenBoxRows.filter((r) => r.locationId === locationId);
    const totalSlots = rows.reduce((sum, r) => sum + r.capacity, 0);
    const totalFilled = rows.reduce((sum, r) => sum + r.queenBoxes.length, 0);
    const developing = rows.reduce(
      (sum, r) => sum + r.queenBoxes.filter((b) => b.status === "developing").length,
      0
    );
    const mature = rows.reduce(
      (sum, r) => sum + r.queenBoxes.filter((b) => b.status === "mature").length,
      0
    );
    return { totalRows: rows.length, totalSlots, totalFilled, developing, mature };
  };

  const [editModeRows, setEditModeRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDraggingRows, setIsDraggingRows] = useState(false);

  const handleRowsReorder = useCallback(async (reorderedRows: QueenBoxRow[]) => {
    await reorderQueenBoxRows(reorderedRows);
  }, [reorderQueenBoxRows]);

  if (loading) {
    return (
      <View style={styles.container}>
        <GridSkeleton rows={3} cols={5} />
      </View>
    );
  }

  const selectedLocation = state.locations.find((l) => l.id === selectedLocationId);

  // Filter rows by search query
  const searchedRows = searchQuery
    ? filteredRows.filter(row =>
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.queenBoxes.some(b => b.number.toString().includes(searchQuery))
      )
    : filteredRows;

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

      {/* Location Selector — dynamic from state.locations */}
      <View style={styles.locationSelector}>
        {state.locations.map((loc) => {
          const isActive = loc.id === selectedLocationId;
          const stats = getLocationStats(loc.id);
          return (
            <TouchableOpacity
              key={loc.id}
              style={[
                styles.locationButton,
                isActive && styles.locationButtonActive,
              ]}
              onPress={() => setSelectedLocationId(loc.id)}
            >
              <Ionicons
                name={loc.name.toLowerCase().includes("kuc") ? "home" : "leaf"}
                size={24}
                color={isActive ? COLORS.surface : COLORS.textPrimary}
              />
              <View style={styles.locationInfo}>
                <Text
                  style={[
                    styles.locationName,
                    isActive && styles.locationNameActive,
                  ]}
                >
                  {loc.name}
                </Text>
                <Text
                  style={[
                    styles.locationStats,
                    isActive && styles.locationStatsActive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {stats.totalRows} redova • {stats.totalFilled}/{stats.totalSlots} oplodnjaka
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="cube-outline" size={24} color={COLORS.info} />
          <Text style={styles.summaryNumber}>
            {filteredRows.reduce(
              (sum, row) => sum + row.queenBoxes.filter((b) => b.status === "developing").length,
              0
            )}
          </Text>
          <Text style={styles.summaryLabel}>U razvoju</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.success} />
          <Text style={styles.summaryNumber}>
            {filteredRows.reduce(
              (sum, row) => sum + row.queenBoxes.filter((b) => b.status === "mature").length,
              0
            )}
          </Text>
          <Text style={styles.summaryLabel}>Zrele</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="grid-outline" size={24} color={COLORS.textPrimary} />
          <Text style={styles.summaryNumber}>
            {filteredRows.reduce((sum, row) => sum + row.queenBoxes.length, 0)}
          </Text>
          <Text style={styles.summaryLabel}>Ukupno</Text>
        </View>
      </View>

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Pretraži redove/oplodnjake..." />

      {/* Color Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: COLORS.primary }]} />
          <Text style={styles.legendLabel}>U razvoju</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: COLORS.success, backgroundColor: COLORS.successLight }]} />
          <Text style={styles.legendLabel}>Zrela</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: COLORS.borderMedium, backgroundColor: COLORS.border, opacity: 0.7 }]} />
          <Text style={styles.legendLabel}>Prazna</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendCounterSwatch]}>
            <Text style={styles.legendCounterText}>15d</Text>
          </View>
          <Text style={styles.legendLabel}>Dani do zrelosti</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderColor: COLORS.danger }]} />
          <Text style={styles.legendLabel}>Zahtijeva pažnju</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} scrollEnabled={!isDraggingRows}>
        {searchedRows.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title={searchQuery ? "Nema rezultata" : "Nema redova"}
            message={searchQuery ? "Pokušajte drugi pojam za pretragu" : `Dodajte prvi red oplodnjaka za lokaciju ${selectedLocation?.name || ""}`}
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
                      size={24}
                      color={COLORS.textPrimary}
                    />
                    <Text style={styles.rowName}>{row.name}</Text>
                    <View style={styles.rowBadge}>
                      <Text style={styles.rowBadgeText} allowFontScaling={false}>{stats.filled}/{stats.total}</Text>
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.quickStats}>
                    <View style={styles.statDot}>
                      <View style={[styles.dot, { backgroundColor: COLORS.borderMedium }]} />
                      <Text style={styles.statNumber} allowFontScaling={false}>{stats.emptySlots}</Text>
                    </View>
                    <View style={styles.statDot}>
                      <View style={[styles.dot, { backgroundColor: COLORS.info }]} />
                      <Text style={styles.statNumber} allowFontScaling={false}>{stats.developing}</Text>
                    </View>
                    <View style={styles.statDot}>
                      <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                      <Text style={styles.statNumber} allowFontScaling={false}>{stats.mature}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Slot Grid (shown when expanded) */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.boxesGrid}>
                      {/* Existing queen boxes (unordered — numbers are random) */}
                      {row.queenBoxes.map((box) => {
                        const daysUntilMature = calculateDaysUntilMature(box);

                        return (
                          <TouchableOpacity
                            key={box.id}
                            style={[
                              styles.queenBox,
                              { width: boxSize, height: boxSize, borderRadius: boxSize * 0.18 },
                              { borderColor: box.status === "mature" ? COLORS.success : getHealthColor(box.health) },
                              box.status === "empty" && styles.queenBoxEmpty,
                              box.status === "mature" && styles.queenBoxMature,
                              editModeRows.includes(row.id) && styles.queenBoxEditMode,
                            ]}
                            onPress={() =>
                              editModeRows.includes(row.id)
                                ? openEditBoxModal(box, row.id)
                                : handleQuickStatusToggle(row.id, box)
                            }
                            onLongPress={() => openEditBoxModal(box, row.id)}
                            accessibilityLabel={`Oplodnjak ${box.number}, ${box.status === 'empty' ? 'prazan' : box.status === 'developing' ? 'u razvoju' : 'zreo'}`}
                            accessibilityHint="Pritisni za promjenu statusa, dugo drži za izmjenu"
                          >
                            <Text style={styles.boxNumber} allowFontScaling={false}>{box.number}</Text>

                            {/* Status indicator with icon */}
                            <View
                              style={[
                                styles.statusIndicator,
                                { backgroundColor: getStatusColor(box.status) },
                              ]}
                            >
                              {box.status === "developing" && (
                                <Ionicons name="time" size={8} color={COLORS.surface} />
                              )}
                              {box.status === "mature" && (
                                <Ionicons name="checkmark" size={8} color={COLORS.surface} />
                              )}
                            </View>

                            {/* Days counter */}
                            {daysUntilMature !== null && (
                              <View style={styles.daysCounter}>
                                <Text style={styles.daysText} allowFontScaling={false}>{daysUntilMature}d</Text>
                              </View>
                            )}

                            {/* Mature indicator */}
                            {box.status === "mature" && (
                              <Ionicons
                                name="checkmark-circle"
                                size={14}
                                color={COLORS.success}
                                style={styles.matureIcon}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}

                      {/* Empty add slots for remaining capacity */}
                      {row.queenBoxes.length < row.capacity &&
                        Array.from({ length: row.capacity - row.queenBoxes.length }, (_, i) => (
                          <TouchableOpacity
                            key={`empty-${i}`}
                            style={[
                              styles.queenBox,
                              styles.emptySlot,
                              { width: boxSize, height: boxSize, borderRadius: boxSize * 0.18 },
                            ]}
                            onPress={() => handleEmptySlotPress(row.id, i + 1)}
                            accessibilityLabel="Prazan slot"
                            accessibilityHint="Pritisni da dodaš oplodnjak"
                          >
                            <Ionicons name="add" size={FONT_SIZE.lg} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        ))
                      }
                    </View>

                    {/* Row Actions */}
                    <View style={styles.rowActions}>
                      {editModeRows.includes(row.id) ? (
                        <TouchableOpacity
                          style={[styles.rowActionButton, styles.rowActionButtonSave]}
                          onPress={() =>
                            setEditModeRows((prev) => prev.filter((id) => id !== row.id))
                          }
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.surface} />
                          <Text style={[styles.rowActionText, { color: COLORS.surface }]}>
                            Sačuvaj
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.rowActionButton}
                          onPress={() =>
                            setEditModeRows((prev) => [...prev, row.id])
                          }
                        >
                          <Ionicons name="pencil-outline" size={20} color={COLORS.info} />
                          <Text style={[styles.rowActionText, { color: COLORS.info }]}>
                            Izmjeni
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.rowActionButton}
                        onPress={() => handleOpenEditRow(row)}
                      >
                        <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                        <Text style={[styles.rowActionText, { color: COLORS.primary }]}>
                          Uredi red
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rowActionButton}
                        onPress={() => handleDeleteRow(row.id, row.name)}
                      >
                        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                        <Text style={[styles.rowActionText, { color: COLORS.danger }]}>
                          Obriši red
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
            }}
          />
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </TouchableOpacity>

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
          label="Kapacitet (broj mjesta)"
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
          placeholder="Npr. Red 1, Red A..."
        />

        <Picker
          label="Lokacija"
          value={formData.locationId}
          options={locationOptions}
          onValueChange={(value) =>
            setFormData({ ...formData, locationId: value as string })
          }
        />

        <Input
          label="Kapacitet (broj mjesta)"
          value={formData.capacity}
          onChangeText={(text) => setFormData({ ...formData, capacity: text })}
          placeholder="Npr. 30"
          keyboardType="numeric"
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Red će imati {formData.capacity ? parseInt(formData.capacity) || 0 : 0} praznih mjesta.
            Dodajte oplodnjake pritiskom na prazne slotove.
          </Text>
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

      {/* Add Box Number Modal */}
      <Modal
        visible={addBoxModalVisible}
        onClose={() => {
          setAddBoxModalVisible(false);
          setPendingSlotRowId(null);
          setPendingSlotNumber(null);
          setNewBoxNumber("");
        }}
        title="Dodaj Oplodnjak"
      >
        <Input
          label="Broj oplodnjaka (1-999)"
          value={newBoxNumber}
          onChangeText={setNewBoxNumber}
          placeholder="Npr. 42"
          keyboardType="numeric"
        />

        {newBoxNumber !== "" && usedBoxNumbers.has(parseInt(newBoxNumber)) && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={SPACING.xl} color={COLORS.danger} />
            <Text style={styles.errorText}>
              Oplodnjak broj {newBoxNumber} već postoji.
            </Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={SPACING.xl} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Tajmer od 25 dana će automatski početi.
          </Text>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setAddBoxModalVisible(false);
              setPendingSlotRowId(null);
              setPendingSlotNumber(null);
              setNewBoxNumber("");
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Dodaj"
            onPress={handleConfirmAddBox}
            disabled={!newBoxNumber || usedBoxNumbers.has(parseInt(newBoxNumber)) || saving}
            loading={saving}
            style={{ flex: 1, marginLeft: SPACING.sm }}
          />
        </View>
      </Modal>

      {/* Edit Box Modal */}
      <Modal
        visible={editBoxModalVisible}
        onClose={() => {
          setEditBoxModalVisible(false);
          resetBoxForm();
        }}
        title={`Oplodnjak ${editingBox?.number || ""}`}
        hasUnsavedChanges={boxFormData.notes !== '' || boxFormData.startDate !== null}
      >
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Informacije</Text>

          <Input
            label="Broj oplodnjaka"
            value={boxFormData.displayNumber}
            onChangeText={(text) =>
              setBoxFormData({ ...boxFormData, displayNumber: text })
            }
            placeholder="Npr. 125"
            keyboardType="numeric"
          />

          <Picker
            label="Status oplodnjaka"
            value={boxFormData.status}
            options={statusOptions}
            onValueChange={(value) =>
              setBoxFormData({ ...boxFormData, status: value as QueenBoxStatus })
            }
          />

          <Picker
            label="Zdravlje"
            value={boxFormData.health}
            options={healthOptions}
            onValueChange={(value) =>
              setBoxFormData({ ...boxFormData, health: value as QueenBoxHealth })
            }
          />
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Datumi</Text>

          <DatePicker
            label="Datum početka (kada je matičnjak postavljen)"
            value={boxFormData.startDate}
            onChange={(date) =>
              setBoxFormData({ ...boxFormData, startDate: date })
            }
            placeholder="Izaberite datum"
          />

          {boxFormData.startDate && (
            <View style={styles.maturityInfo}>
              <Ionicons name="time-outline" size={18} color={COLORS.info} />
              <Text style={styles.maturityText}>
                Matica će biti zrela:{" "}
                {formatDate(
                  new Date(
                    boxFormData.startDate.getTime() + 25 * 24 * 60 * 60 * 1000
                  )
                )}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Input
            label="Bilješke (opciono)"
            value={boxFormData.notes}
            onChangeText={(text) =>
              setBoxFormData({ ...boxFormData, notes: text })
            }
            placeholder="Dodatne informacije..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Delete box button */}
        {editingBox && editingRowId && (
          <TouchableOpacity
            style={styles.deleteBoxButton}
            onPress={() => {
              setEditBoxModalVisible(false);
              resetBoxForm();
              handleRemoveSlot(editingRowId, editingBox.id, editingBox.number);
            }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <Text style={styles.deleteBoxText}>Obriši oplodnjak</Text>
          </TouchableOpacity>
        )}

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setEditBoxModalVisible(false);
              resetBoxForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Sačuvaj"
            onPress={handleSaveBox}
            loading={saving}
            style={{ flex: 1, marginLeft: SPACING.sm }}
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
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    ...SHADOW.md,
  },
  summaryNumber: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    paddingHorizontal: 10,
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
  boxesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  queenBox: {
    borderWidth: 3,
    borderStyle: "solid",
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  queenBoxEmpty: {
    backgroundColor: COLORS.border,
    opacity: 0.7,
  },
  queenBoxMature: {
    backgroundColor: COLORS.successLight,
  },
  emptySlot: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.background,
    opacity: 0.6,
  },
  emptySlotNumber: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  boxNumber: {
    fontSize: FONT_SIZE.md,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  statusIndicator: {
    position: "absolute",
    top: 3,
    right: 3,
    width: SPACING.md,
    height: SPACING.md,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  daysCounter: {
    position: "absolute",
    bottom: 2,
    left: 2,
    backgroundColor: COLORS.info,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
    borderRadius: SPACING.xs,
  },
  daysText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "bold",
    color: COLORS.surface,
  },
  matureIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMedium,
  },
  rowActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: SPACING.sm,
  },
  rowActionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
    color: COLORS.success,
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginBottom: SPACING.lg,
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
  sectionContainer: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMedium,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  maturityInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.infoLight,
    padding: 10,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  maturityText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.info,
    fontWeight: "500",
  },
  deleteBoxButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.md,
  },
  deleteBoxText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.danger,
    fontWeight: "500",
  },
  queenBoxEditMode: {
    opacity: 0.85,
    borderStyle: "dashed",
  },
  rowActionButtonSave: {
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
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
  legendCounterSwatch: {
    backgroundColor: COLORS.info,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: SPACING.xs,
  },
  legendCounterText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "bold",
    color: COLORS.surface,
  },
});
