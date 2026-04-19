import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  useWindowDimensions,
} from "react-native";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import Input from "../components/Input";
import Modal from "../components/Modal";
import Picker, { PickerOption } from "../components/Picker";
import SearchBar from "../components/SearchBar";
import { GridSkeleton } from "../components/SkeletonLoader";
import { useApp } from "../context/AppContext";
import { Hive, HiveHealth, HiveNote, HiveRow, HiveType, SwarmStatus } from "../types";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

const healthOptions: PickerOption[] = [
  { label: "Dobro", value: "good" },
  { label: "Loše", value: "bad" },
];

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
  const [swarmFormData, setSwarmFormData] = useState({
    health: "good" as HiveHealth,
    swarmStatus: "empty" as SwarmStatus,
    swarmStartDate: null as Date | null,
    notes: "",
    isActive: true,
  });
  const [formData, setFormData] = useState({
    rowName: "",
    capacity: "",
  });
  const [editRowModalVisible, setEditRowModalVisible] = useState(false);
  const [editingRow, setEditingRow] = useState<HiveRow | null>(null);
  const [editRowFormData, setEditRowFormData] = useState({ rowName: "", capacity: "" });
  const [hiveFormData, setHiveFormData] = useState<{
    hiveNumber: string;
    health: string;
    hasQueen: boolean;
    queenId: string;
    newNote: string;
    lastInspection: Date | null;
    frameCount: string;
    isHarvested: boolean;
    hasPollen: boolean;
    feedingDates: Date[];
    harvestDates: Date[];
    isActive: boolean;
  }>({
    hiveNumber: "",
    health: "good",
    hasQueen: true,
    queenId: "",
    newNote: "",
    lastInspection: null,
    frameCount: "10",
    isHarvested: false,
    hasPollen: false,
    feedingDates: [],
    harvestDates: [],
    isActive: true,
  });

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

  const resetSwarmForm = () => {
    setSwarmFormData({
      health: "good",
      swarmStatus: "empty",
      swarmStartDate: null,
      notes: "",
      isActive: true,
    });
  };

  const resetHiveForm = () => {
    setHiveFormData({
      hiveNumber: "",
      health: "good",
      hasQueen: true,
      queenId: "",
      newNote: "",
      lastInspection: null,
      frameCount: "10",
      isHarvested: false,
      hasPollen: false,
      feedingDates: [],
      harvestDates: [],
      isActive: true,
    });
    setEditingHive(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddRowModalVisible(true);
  };

  const openEditHiveModal = (hive: Hive, rowId: string) => {
    setEditingHive(hive);
    if (hive.type === 'swarm') {
      setSwarmFormData({
        health: hive.health,
        swarmStatus: hive.swarmStatus || "empty",
        swarmStartDate: hive.swarmStartDate ? new Date(hive.swarmStartDate) : null,
        notes: hive.notes?.[0]?.text || "",
        isActive: hive.isActive !== false,
      });
      setEditSwarmModalVisible(true);
    } else {
      setHiveFormData({
        hiveNumber: hive.number.toString(),
        health: hive.health,
        hasQueen: hive.hasQueen ?? true,
        queenId: hive.queenId || "",
        newNote: "",
        lastInspection: hive.lastInspection ? new Date(hive.lastInspection) : null,
        frameCount: hive.frameCount?.toString() || "10",
        isHarvested: hive.isHarvested || false,
        hasPollen: hive.hasPollen || false,
        feedingDates: (hive.feedingDates || []).map((d) => new Date(d)),
        harvestDates: (hive.harvestDates || []).map((d) => new Date(d)),
        isActive: hive.isActive !== false,
      });
      setEditHiveModalVisible(true);
    }
  };

  const handleAddNote = () => {
    if (!editingHive || !hiveFormData.newNote.trim()) return;

    const newNote: HiveNote = {
      id: Crypto.randomUUID(),
      text: hiveFormData.newNote.trim(),
      createdAt: new Date(),
    };

    const updatedHive: Hive = {
      ...editingHive,
      notes: [...(editingHive.notes || []), newNote],
      updatedAt: new Date(),
    };

    // Update in location
    if (currentLocation) {
      const updatedRows = currentLocation.rows.map((row) => ({
        ...row,
        hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)),
      }));

      updateLocation(currentLocation.id, { rows: updatedRows });
      setEditingHive(updatedHive);
      setHiveFormData({ ...hiveFormData, newNote: "" });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (!editingHive || !currentLocation) return;

    const updatedHive: Hive = {
      ...editingHive,
      notes: (editingHive.notes || []).filter((note) => note.id !== noteId),
      updatedAt: new Date(),
    };

    const updatedRows = currentLocation.rows.map((row) => ({
      ...row,
      hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)),
    }));

    updateLocation(currentLocation.id, { rows: updatedRows });
    setEditingHive(updatedHive);
  };

  const handleSaveHive = async () => {
    if (!editingHive || !currentLocation) return;
    setSaving(true);

    const updatedHive: Hive = {
      ...editingHive,
      type: editingHive.type || 'hive',
      number: parseInt(hiveFormData.hiveNumber) || editingHive.number,
      health: hiveFormData.health as HiveHealth,
      hasQueen: hiveFormData.hasQueen,
      queenId: hiveFormData.queenId || undefined,
      lastInspection: hiveFormData.lastInspection || undefined,
      frameCount: parseInt(hiveFormData.frameCount) || 10,
      isHarvested: hiveFormData.isHarvested,
      hasPollen: hiveFormData.hasPollen,
      feedingDates: hiveFormData.feedingDates,
      lastFeedingDate: hiveFormData.feedingDates.length > 0
        ? hiveFormData.feedingDates[hiveFormData.feedingDates.length - 1]
        : undefined,
      harvestDates: hiveFormData.harvestDates,
      lastHarvestDate: hiveFormData.harvestDates.length > 0
        ? hiveFormData.harvestDates[hiveFormData.harvestDates.length - 1]
        : undefined,
      updatedAt: new Date(),
      ...(hiveFormData.isActive !== undefined && {
        isActive: hiveFormData.isActive,
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
    resetHiveForm();
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

    await updateLocation(currentLocation.id, { rows: updatedRows });
    setPendingSlotRowId(null);
    setPendingSlotNumber(null);
  };

  const handleRemoveSlot = (rowId: string, hiveId: string, hiveNumber: number, type: HiveType) => {
    if (!currentLocation) return;

    const label = type === 'swarm' ? 'roj' : 'košnicu';
    Alert.alert(
      `Obriši ${type === 'swarm' ? 'Roj' : 'Košnicu'}`,
      `Da li ste sigurni da želite da obrišete ${label} ${hiveNumber}?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const updatedRows = currentLocation.rows.map((r) =>
              r.id === rowId
                ? { ...r, hives: r.hives.filter((h) => h.id !== hiveId), updatedAt: new Date() }
                : r
            );
            await updateLocation(currentLocation.id, { rows: updatedRows });
          },
        },
      ]
    );
  };

  const handleSaveSwarm = async () => {
    if (!editingHive || !currentLocation) return;
    setSaving(true);

    const updatedHive: Hive = {
      ...editingHive,
      health: swarmFormData.health,
      swarmStatus: swarmFormData.swarmStatus,
      swarmStartDate: swarmFormData.swarmStartDate || undefined,
      isActive: swarmFormData.isActive,
      updatedAt: new Date(),
    };

    const updatedRows = currentLocation.rows.map((row) => ({
      ...row,
      hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)),
    }));

    await updateLocation(currentLocation.id, { rows: updatedRows });
    setSaving(false);
    setEditSwarmModalVisible(false);
    resetSwarmForm();
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

    Alert.alert(
      "Obriši Red",
      `Da li ste sigurni da želite da obrišete "${rowName}" i sve košnice u njemu?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: async () => {
            const updatedRows = currentLocation.rows.filter((r) => r.id !== rowId);
            await updateLocation(currentLocation.id, { rows: updatedRows });
            setExpandedRows((prev) => prev.filter((id) => id !== rowId));
          },
        },
      ]
    );
  };

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) =>
      prev.includes(rowId)
        ? prev.filter((id) => id !== rowId)
        : [...prev, rowId]
    );
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "good":
        return COLORS.success;
      case "bad":
        return COLORS.danger;
      case "warning":
        return COLORS.primary;
      default:
        return COLORS.textMuted;
    }
  };

  const getSwarmStatusLabel = (status: SwarmStatus) => {
    switch (status) {
      case "empty": return "Prazan";
      case "developing": return "Razvija se";
      case "ready": return "Spreman";
      case "natural": return "Prirodni";
    }
  };

  const getSwarmStatusColor = (status: SwarmStatus) => {
    switch (status) {
      case "empty": return COLORS.textMuted;
      case "developing": return COLORS.primary;
      case "ready": return COLORS.success;
      case "natural": return COLORS.accent.swarm;
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
        <Text style={styles.loadingText}>{error}</Text>
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
                <Text
                  style={[
                    styles.locationName,
                    isSelected && styles.locationNameActive,
                  ]}
                >
                  {location.name}
                </Text>
                <Text
                  style={[
                    styles.locationStats,
                    isSelected && styles.locationStatsActive,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {stats.totalRows} redova • {stats.totalFilled}/{stats.totalSlots} mjesta
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Pretraži košnice po broju..." />

      {/* Rows List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {displayRows.map((row) => {
          const isExpanded = expandedRows.includes(row.id);
          const stats = getRowStats(row);

          return (
            <View key={row.id} style={styles.rowContainer}>
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
                  <Text style={styles.rowName}>{row.name}</Text>
                  <View style={styles.rowBadge}>
                    <Text style={styles.rowBadgeText} allowFontScaling={false}>{stats.filled}/{stats.total}</Text>
                  </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <View key="hives" style={styles.statDot}>
                    <Ionicons name="grid-outline" size={12} color={COLORS.accent.hive} />
                    <Text style={styles.statNumber} allowFontScaling={false}>{stats.hives}</Text>
                  </View>
                  <View key="swarms" style={styles.statDot}>
                    <Ionicons name="cube-outline" size={12} color={COLORS.accent.swarm} />
                    <Text style={styles.statNumber} allowFontScaling={false}>{stats.swarms}</Text>
                  </View>
                  <View key="empty" style={styles.statDot}>
                    <View style={[styles.dot, { backgroundColor: COLORS.borderMedium }]} />
                    <Text style={styles.statNumber} allowFontScaling={false}>{stats.empty}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Hives Grid (shown when expanded) */}
              {isExpanded && (
                <View style={styles.expandedContent}>
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
                            <Text style={styles.emptySlotNumber} allowFontScaling={false}>{slotNum}</Text>
                            <Ionicons name="add" size={FONT_SIZE.sm} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        );
                      }

                      const isInactive = hive.isActive === false;
                      const isSwarm = hive.type === 'swarm';

                      return (
                        <TouchableOpacity
                          key={hive.id}
                          style={[
                            styles.hiveBox,
                            { width: hiveBoxSize, height: hiveBoxSize, borderRadius: hiveBoxSize * 0.16 },
                            { borderColor: getHealthColor(hive.health) },
                            isSwarm && styles.swarmBox,
                            isInactive && styles.hiveBoxInactive,
                          ]}
                          onPress={() => openEditHiveModal(hive, row.id)}
                          onLongPress={() => handleRemoveSlot(row.id, hive.id, hive.number, hive.type)}
                          accessibilityLabel={`${isSwarm ? 'Roj' : 'Košnica'} ${hive.number}`}
                          accessibilityHint="Pritisni za izmjenu, dugo drži za brisanje"
                        >
                          <Text
                            style={[
                              styles.hiveNumber,
                              isInactive && styles.hiveNumberInactive,
                              isSwarm && { color: COLORS.accent.swarm },
                            ]}
                            allowFontScaling={false}
                          >
                            {hive.number}
                          </Text>
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
                              color={COLORS.success}
                              style={styles.queenIcon}
                            />
                          ) : (
                            <Ionicons
                              name="alert-circle"
                              size={FONT_SIZE.xs}
                              color={COLORS.danger}
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
                      <Text style={[styles.rowActionText, { color: COLORS.primary }]}>
                        Uredi red
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rowActionButton}
                      onPress={() => handleDeleteRow(row.id, row.name)}
                    >
                      <Ionicons name="trash-outline" size={SPACING.xl} color={COLORS.danger} />
                      <Text style={[styles.rowActionText, { color: COLORS.danger }]}>
                        Obriši red
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
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
          <Text style={styles.infoText}>
            Biće kreiran red sa {formData.capacity || "0"} praznih mjesta.
            Košnice i rojeve dodajete klikom na prazan slot.
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

      {/* Edit Hive Modal */}
      <Modal
        visible={editHiveModalVisible}
        onClose={() => {
          setEditHiveModalVisible(false);
          resetHiveForm();
        }}
        title={`Košnica ${editingHive?.number || ""}`}
        hasUnsavedChanges={hiveFormData.newNote.trim() !== ''}
      >
        {/* Type Switcher */}
        <View style={styles.typeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.typeSwitcherOption, styles.typeSwitcherOptionActive, { borderColor: COLORS.accent.hive }]}
          >
            <Ionicons name="grid-outline" size={18} color={COLORS.accent.hive} />
            <Text style={[styles.typeSwitcherLabel, { color: COLORS.accent.hive }]}>Košnica</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeSwitcherOption]}
            onPress={async () => {
              if (!editingHive || !currentLocation) return;
              // Convert hive to swarm
              const updatedHive: Hive = {
                ...editingHive,
                type: 'swarm' as HiveType,
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
                updatedAt: new Date(),
              };
              const updatedRows = currentLocation.rows.map((row) => ({
                ...row,
                hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)),
              }));
              await updateLocation(currentLocation.id, { rows: updatedRows });
              setEditHiveModalVisible(false);
              resetHiveForm();
              // Open swarm modal with updated hive
              setEditingHive(updatedHive);
              setSwarmFormData({
                health: updatedHive.health,
                swarmStatus: 'empty',
                swarmStartDate: null,
                notes: "",
                isActive: updatedHive.isActive !== false,
              });
              setEditSwarmModalVisible(true);
            }}
          >
            <Ionicons name="cube-outline" size={18} color={COLORS.textMuted} />
            <Text style={[styles.typeSwitcherLabel, { color: COLORS.textMuted }]}>Roj</Text>
          </TouchableOpacity>
        </View>

        {/* Opšte Informacije Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Opšte informacije</Text>

          <Input
            label="Broj košnice"
            value={hiveFormData.hiveNumber}
            onChangeText={(text) =>
              setHiveFormData({ ...hiveFormData, hiveNumber: text })
            }
            placeholder="Npr. 1, 2, 3..."
            keyboardType="numeric"
          />

          <Picker
            label="Zdravlje košnice"
            value={hiveFormData.health}
            options={healthOptions}
            onValueChange={(value) =>
              setHiveFormData({ ...hiveFormData, health: value as HiveHealth })
            }
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Ima maticu</Text>
            <TouchableOpacity
              style={[
                styles.switch,
                hiveFormData.hasQueen && styles.switchActive,
              ]}
              onPress={() =>
                setHiveFormData({
                  ...hiveFormData,
                  hasQueen: !hiveFormData.hasQueen,
                })
              }
            >
              <View
                style={[
                  styles.switchThumb,
                  hiveFormData.hasQueen && styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <Input
            label="Broj ramova"
            value={hiveFormData.frameCount}
            onChangeText={(text) =>
              setHiveFormData({ ...hiveFormData, frameCount: text })
            }
            placeholder="10"
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Aktivna košnica</Text>
            <TouchableOpacity
              style={[
                styles.switch,
                hiveFormData.isActive && styles.switchActive,
              ]}
              onPress={() => {
                const newIsActive = !hiveFormData.isActive;
                if (newIsActive) {
                  // Reactivating - reset all dates for new colony
                  setHiveFormData({
                    ...hiveFormData,
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
                  setHiveFormData({
                    ...hiveFormData,
                    isActive: false,
                  });
                }
              }}
            >
              <View
                style={[
                  styles.switchThumb,
                  hiveFormData.isActive && styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Produkcija Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Produkcija</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Vrcano</Text>
            <TouchableOpacity
              style={[
                styles.switch,
                hiveFormData.isHarvested && styles.switchActive,
              ]}
              onPress={() =>
                setHiveFormData({
                  ...hiveFormData,
                  isHarvested: !hiveFormData.isHarvested,
                })
              }
            >
              <View
                style={[
                  styles.switchThumb,
                  hiveFormData.isHarvested && styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Polen</Text>
            <TouchableOpacity
              style={[
                styles.switch,
                hiveFormData.hasPollen && styles.switchActive,
              ]}
              onPress={() =>
                setHiveFormData({
                  ...hiveFormData,
                  hasPollen: !hiveFormData.hasPollen,
                })
              }
            >
              <View
                style={[
                  styles.switchThumb,
                  hiveFormData.hasPollen && styles.switchThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Harvest Dates Section */}
          <View style={styles.feedingSection}>
            <Text style={styles.feedingLabel}>
              Vrcanja ({hiveFormData.harvestDates.length})
            </Text>
            <DatePicker
              label="Dodaj novo vrcanje"
              value={null}
              onChange={(date) => {
                if (date) {
                  setHiveFormData({
                    ...hiveFormData,
                    harvestDates: [...hiveFormData.harvestDates, date].sort(
                      (a, b) => b.getTime() - a.getTime()
                    ),
                  });
                }
              }}
            />
            {hiveFormData.harvestDates.length > 0 && (
              <View style={styles.feedingList}>
                {hiveFormData.harvestDates.map((date, index) => (
                  <View key={index} style={styles.feedingItem}>
                    <Text style={styles.feedingDate}>{formatDate(date)}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setHiveFormData({
                          ...hiveFormData,
                          harvestDates: hiveFormData.harvestDates.filter(
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
        </View>

        {/* Održavanje Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Održavanje</Text>

          {/* Feeding Dates Section */}
          <View style={styles.feedingSection}>
            <Text style={styles.feedingLabel}>
              Prihrane ({hiveFormData.feedingDates.length})
            </Text>
            <DatePicker
              label="Dodaj novu prihranu"
              value={null}
              onChange={(date) => {
                if (date) {
                  setHiveFormData({
                    ...hiveFormData,
                    feedingDates: [...hiveFormData.feedingDates, date].sort(
                      (a, b) => b.getTime() - a.getTime()
                    ),
                  });
                }
              }}
            />
            {hiveFormData.feedingDates.length > 0 && (
              <View style={styles.feedingList}>
                {hiveFormData.feedingDates.map((date, index) => (
                  <View key={index} style={styles.feedingItem}>
                    <Text style={styles.feedingDate}>{formatDate(date)}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setHiveFormData({
                          ...hiveFormData,
                          feedingDates: hiveFormData.feedingDates.filter(
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
            value={hiveFormData.lastInspection}
            onChange={(date) =>
              setHiveFormData({ ...hiveFormData, lastInspection: date })
            }
          />
        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Bilješke</Text>

          {/* Existing notes */}
          {editingHive?.notes && Array.isArray(editingHive.notes) && editingHive.notes.length > 0 && (
            <View style={styles.notesList}>
              {editingHive.notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteContent}>
                    <Text style={styles.noteText}>{note.text}</Text>
                    <Text style={styles.noteDate}>
                      {formatDate(note.createdAt)}
                    </Text>
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
              value={hiveFormData.newNote}
              onChangeText={(text) =>
                setHiveFormData({ ...hiveFormData, newNote: text })
              }
              placeholder="Dodaj novu bilješku..."
              multiline
              numberOfLines={3}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button
              title="Dodaj"
              onPress={handleAddNote}
              disabled={!hiveFormData.newNote.trim()}
              style={styles.addNoteButton}
            />
          </View>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setEditHiveModalVisible(false);
              resetHiveForm();
            }}
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
            <Text style={styles.slotTypeLabel}>Košnica</Text>
            <Text style={styles.slotTypeDesc}>Aktivna košnica za proizvodnju meda</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.slotTypeOption, { borderColor: COLORS.accent.swarm }]}
            onPress={() => handleAddSlotWithType('swarm')}
          >
            <Ionicons name="cube-outline" size={32} color={COLORS.accent.swarm} />
            <Text style={styles.slotTypeLabel}>Roj</Text>
            <Text style={styles.slotTypeDesc}>Roj u razvoju ili spreman za prodaju</Text>
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

      {/* Edit Swarm Modal */}
      <Modal
        visible={editSwarmModalVisible}
        onClose={() => {
          setEditSwarmModalVisible(false);
          resetSwarmForm();
          setEditingHive(null);
        }}
        title={`Roj ${editingHive?.number || ""}`}
      >
        {/* Type Switcher */}
        <View style={styles.typeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.typeSwitcherOption]}
            onPress={async () => {
              if (!editingHive || !currentLocation) return;
              // Convert swarm to hive
              const updatedHive: Hive = {
                ...editingHive,
                type: 'hive' as HiveType,
                hasQueen: true,
                frameCount: 10,
                swarmStatus: undefined,
                swarmStartDate: undefined,
                updatedAt: new Date(),
              };
              const updatedRows = currentLocation.rows.map((row) => ({
                ...row,
                hives: row.hives.map((h) => (h.id === editingHive.id ? updatedHive : h)),
              }));
              await updateLocation(currentLocation.id, { rows: updatedRows });
              setEditSwarmModalVisible(false);
              resetSwarmForm();
              // Open hive modal with updated hive
              setEditingHive(updatedHive);
              setHiveFormData({
                hiveNumber: updatedHive.number.toString(),
                health: updatedHive.health,
                hasQueen: true,
                queenId: "",
                newNote: "",
                lastInspection: null,
                frameCount: "10",
                isHarvested: false,
                hasPollen: false,
                feedingDates: [],
                harvestDates: [],
                isActive: updatedHive.isActive !== false,
              });
              setEditHiveModalVisible(true);
            }}
          >
            <Ionicons name="grid-outline" size={18} color={COLORS.textMuted} />
            <Text style={[styles.typeSwitcherLabel, { color: COLORS.textMuted }]}>Košnica</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeSwitcherOption, styles.typeSwitcherOptionActive, { borderColor: COLORS.accent.swarm }]}
          >
            <Ionicons name="cube-outline" size={18} color={COLORS.accent.swarm} />
            <Text style={[styles.typeSwitcherLabel, { color: COLORS.accent.swarm }]}>Roj</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Picker
            label="Zdravlje"
            value={swarmFormData.health}
            options={[
              { label: "Dobro", value: "good" },
              { label: "Upozorenje", value: "warning" },
            ]}
            onValueChange={(value) =>
              setSwarmFormData({ ...swarmFormData, health: value as HiveHealth })
            }
          />

          <Picker
            label="Status roja"
            value={swarmFormData.swarmStatus}
            options={[
              { label: "Prazan", value: "empty" },
              { label: "Razvija se", value: "developing" },
              { label: "Spreman", value: "ready" },
              { label: "Prirodni", value: "natural" },
            ]}
            onValueChange={(value) =>
              setSwarmFormData({ ...swarmFormData, swarmStatus: value as SwarmStatus })
            }
          />

          <DatePicker
            label="Datum početka razvoja"
            value={swarmFormData.swarmStartDate}
            onChange={(date) =>
              setSwarmFormData({ ...swarmFormData, swarmStartDate: date })
            }
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Aktivan</Text>
            <TouchableOpacity
              style={[styles.switch, swarmFormData.isActive && styles.switchActive]}
              onPress={() =>
                setSwarmFormData({ ...swarmFormData, isActive: !swarmFormData.isActive })
              }
            >
              <View style={[styles.switchThumb, swarmFormData.isActive && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={() => {
              setEditSwarmModalVisible(false);
              resetSwarmForm();
              setEditingHive(null);
            }}
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
  swarmBox: {
    backgroundColor: COLORS.accent.swarmLight,
  },
  hiveBox: {
    borderWidth: 3,
    backgroundColor: COLORS.background,
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
    marginBottom: SPACING.xxl,
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  switchLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.borderMedium,
    padding: 2,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: COLORS.primary,
  },
  switchThumb: {
    width: SPACING.xxl,
    height: SPACING.xxl,
    borderRadius: SPACING.md,
    backgroundColor: COLORS.surface,
    ...SHADOW.sm,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  notesSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  notesLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  notesList: {
    marginBottom: SPACING.md,
  },
  noteItem: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
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
    marginBottom: SPACING.lg,
  },
  feedingLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  feedingList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  feedingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
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
});
