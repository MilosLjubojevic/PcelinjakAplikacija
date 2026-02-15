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
  Alert,
} from "react-native";
import Button from "../components/Button";
import DatePicker from "../components/DatePicker";
import Input from "../components/Input";
import InspectionPhotoPicker from "../components/InspectionPhotoPicker";
import Modal from "../components/Modal";
import Picker, { PickerOption } from "../components/Picker";
import { useApp } from "../context/AppContext";
import { Hive, HiveHealth, HiveNote, HiveRow } from "../types";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

const healthOptions: PickerOption[] = [
  { label: "Dobro", value: "good" },
  { label: "Loše", value: "bad" },
];

export default function HivesScreen() {
  const { state, loading, updateLocation } = useApp();
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
  const [formData, setFormData] = useState({
    rowName: "",
    hiveCount: "",
  });
  const [hiveFormData, setHiveFormData] = useState<{
    hiveNumber: string;
    health: string;
    hasQueen: boolean;
    queenId: string;
    newNote: string;
    notePhotos: string[];
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
    notePhotos: [],
    lastInspection: null,
    frameCount: "10",
    isHarvested: false,
    hasPollen: false,
    feedingDates: [],
    harvestDates: [],
    isActive: true,
  });

  const currentLocation = state.locations.find(
    (loc) => loc.id === selectedLocation
  );

  const resetForm = () => {
    setFormData({
      rowName: "",
      hiveCount: "",
    });
  };

  const resetHiveForm = () => {
    setHiveFormData({
      hiveNumber: "",
      health: "good",
      hasQueen: true,
      queenId: "",
      newNote: "",
      notePhotos: [],
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
    setHiveFormData({
      hiveNumber: hive.number.toString(),
      health: hive.health,
      hasQueen: hive.hasQueen,
      queenId: hive.queenId || "",
      newNote: "",
      notePhotos: [],
      lastInspection: hive.lastInspection ? new Date(hive.lastInspection) : null,
      frameCount: hive.frameCount?.toString() || "10",
      isHarvested: hive.isHarvested || false,
      hasPollen: hive.hasPollen || false,
      feedingDates: (hive.feedingDates || []).map((d) => new Date(d)),
      harvestDates: (hive.harvestDates || []).map((d) => new Date(d)),
      isActive: (hive as any).isActive !== false,
    });
    setEditHiveModalVisible(true);
  };

  const handleAddNote = () => {
    if (!editingHive || !hiveFormData.newNote.trim()) return;

    const newNote: HiveNote = {
      id: Crypto.randomUUID(),
      text: hiveFormData.newNote.trim(),
      photos: hiveFormData.notePhotos.length > 0 ? hiveFormData.notePhotos : undefined,
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
      setHiveFormData({ ...hiveFormData, newNote: "", notePhotos: [] });
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
      number: parseInt(hiveFormData.hiveNumber) || editingHive.number,
      health: hiveFormData.health as any,
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
    if (!currentLocation || !formData.rowName || !formData.hiveCount) {
      return;
    }

    const hiveCount = parseInt(formData.hiveCount);
    if (isNaN(hiveCount) || hiveCount <= 0) {
      return;
    }
    setSaving(true);

    const now = new Date();
    const newRowId = Crypto.randomUUID();

    // Create hives for the new row
    const newHives: Hive[] = Array.from({ length: hiveCount }, (_, i) => ({
      id: Crypto.randomUUID(),
      number: i + 1,
      locationId: currentLocation.id,
      rowId: newRowId,
      health: "good" as const,
      hasQueen: true,
      frameCount: 10,
      createdAt: now,
      updatedAt: now,
    }));

    // Create new row
    const newRow: HiveRow = {
      id: newRowId,
      name: formData.rowName,
      locationId: currentLocation.id,
      hives: newHives,
      order: currentLocation.rows.length,
      createdAt: now,
      updatedAt: now,
    };

    // Update location with new row
    const updatedRows = [...currentLocation.rows, newRow];
    await updateLocation(currentLocation.id, {
      rows: updatedRows,
    });

    setSaving(false);
    setExpandedRows([newRowId]);
    setAddRowModalVisible(false);
    resetForm();
  };

  const handleAddHiveToRow = async (rowId: string) => {
    if (!currentLocation) return;

    const row = currentLocation.rows.find((r) => r.id === rowId);
    if (!row) return;

    // Find the highest hive number in the row and add 1
    const maxNumber = row.hives.length > 0
      ? Math.max(...row.hives.map((h) => h.number))
      : 0;

    const now = new Date();
    const newHive: Hive = {
      id: Crypto.randomUUID(),
      number: maxNumber + 1,
      locationId: currentLocation.id,
      rowId: rowId,
      health: "good",
      hasQueen: true,
      frameCount: 10,
      createdAt: now,
      updatedAt: now,
    };

    const updatedRows = currentLocation.rows.map((r) =>
      r.id === rowId
        ? { ...r, hives: [...r.hives, newHive], updatedAt: now }
        : r
    );

    await updateLocation(currentLocation.id, { rows: updatedRows });
  };

  const handleRemoveHive = (rowId: string, hiveId: string, hiveNumber: number) => {
    if (!currentLocation) return;

    const row = currentLocation.rows.find((r) => r.id === rowId);
    if (!row) return;

    if (row.hives.length <= 1) {
      Alert.alert("Greska", "Red mora imati barem jednu kosnicu. Ako zelite da obrisete sve, obrisite ceo red.");
      return;
    }

    Alert.alert(
      "Obrisi Kosnicu",
      `Da li ste sigurni da zelite da obrisete kosnicu ${hiveNumber}?`,
      [
        { text: "Otkazi", style: "cancel" },
        {
          text: "Obrisi",
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

  const handleDeleteRow = (rowId: string, rowName: string) => {
    if (!currentLocation) return;

    Alert.alert(
      "Obrisi Red",
      `Da li ste sigurni da zelite da obrisete "${rowName}" i sve kosnice u njemu?`,
      [
        { text: "Otkazi", style: "cancel" },
        {
          text: "Obrisi",
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
      default:
        return COLORS.textMuted;
    }
  };

  const getRowStats = (hives: Hive[]) => {
    const good = hives.filter((h) => h.health === "good").length;
    const bad = hives.filter((h) => h.health === "bad").length;
    const withQueen = hives.filter((h) => h.hasQueen).length;
    return { good, bad, total: hives.length, withQueen };
  };

  const getLocationStats = (location: any) => {
    const totalHives = location.rows.reduce(
      (sum: number, row: any) => sum + row.hives.length,
      0
    );
    const totalRows = location.rows.length;
    return { totalHives, totalRows };
  };

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
                >
                  {stats.totalRows} redova • {stats.totalHives} košnica
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rows List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {currentLocation?.rows.map((row) => {
          const isExpanded = expandedRows.includes(row.id);
          const stats = getRowStats(row.hives);

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
                    <Text style={styles.rowBadgeText}>{stats.total}</Text>
                  </View>
                </View>

                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <View key="good" style={styles.statDot}>
                    <View
                      style={[styles.dot, { backgroundColor: COLORS.success }]}
                    />
                    <Text style={styles.statNumber}>{stats.good}</Text>
                  </View>
                  <View key="bad" style={styles.statDot}>
                    <View
                      style={[styles.dot, { backgroundColor: COLORS.danger }]}
                    />
                    <Text style={styles.statNumber}>{stats.bad}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Hives Grid (shown when expanded) */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.hivesGrid}>
                    {row.hives.map((hive) => {
                      const isInactive = (hive as any).isActive === false;
                      return (
                        <TouchableOpacity
                          key={hive.id}
                          style={[
                            styles.hiveBox,
                            { borderColor: getHealthColor(hive.health) },
                            isInactive && styles.hiveBoxInactive,
                          ]}
                          onPress={() => openEditHiveModal(hive, row.id)}
                          onLongPress={() => handleRemoveHive(row.id, hive.id, hive.number)}
                        >
                          <Text
                            style={[
                              styles.hiveNumber,
                              isInactive && styles.hiveNumberInactive,
                            ]}
                          >
                            {hive.number}
                          </Text>
                          {hive.hasQueen ? (
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
                          {hive.hasPollen && (
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
                      onPress={() => handleAddHiveToRow(row.id)}
                    >
                      <Ionicons name="add-circle-outline" size={SPACING.xl} color={COLORS.success} />
                      <Text style={styles.rowActionText}>Dodaj kosnicu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rowActionButton}
                      onPress={() => handleDeleteRow(row.id, row.name)}
                    >
                      <Ionicons name="trash-outline" size={SPACING.xl} color={COLORS.danger} />
                      <Text style={[styles.rowActionText, { color: COLORS.danger }]}>
                        Obrisi red
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
      >
        <Input
          label="Naziv reda"
          value={formData.rowName}
          onChangeText={(text) => setFormData({ ...formData, rowName: text })}
          placeholder="Npr. Red 1, Red A, Severni red..."
        />

        <Input
          label="Broj košnica"
          value={formData.hiveCount}
          onChangeText={(text) => setFormData({ ...formData, hiveCount: text })}
          placeholder="Npr. 35"
          keyboardType="numeric"
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={SPACING.xl} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Biće kreirano {formData.hiveCount || "0"} košnica sa podrazumevanim
            postavkama.
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
            disabled={!formData.rowName || !formData.hiveCount}
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
      >
        {/* Opšte Informacije Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Opšte Informacije</Text>

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
            label="Stanje košnice"
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
            <Text style={styles.switchLabel}>Košnica aktivna</Text>
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
            label="Datum poslednje inspekcije"
            value={hiveFormData.lastInspection}
            onChange={(date) =>
              setHiveFormData({ ...hiveFormData, lastInspection: date })
            }
          />
        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Beleške</Text>

          {/* Existing notes */}
          {editingHive?.notes && Array.isArray(editingHive.notes) && editingHive.notes.length > 0 && (
            <View style={styles.notesList}>
              {editingHive.notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteContent}>
                    <Text style={styles.noteText}>{note.text}</Text>
                    {note.photos && note.photos.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
                        {note.photos.map((uri, i) => (
                          <View key={`${note.id}-photo-${i}`} style={{ marginRight: SPACING.sm }}>
                            <View style={{ width: 60, height: 60, borderRadius: RADIUS.sm, overflow: 'hidden' }}>
                              <View style={{ width: 60, height: 60, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="image" size={24} color={COLORS.textMuted} />
                              </View>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                    <Text style={styles.noteDate}>
                      {formatDate(note.createdAt)}
                      {note.photos && note.photos.length > 0 ? ` • ${note.photos.length} foto` : ''}
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
              placeholder="Dodaj novu belešku..."
              multiline
              numberOfLines={3}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <InspectionPhotoPicker
              photos={hiveFormData.notePhotos}
              onPhotosChange={(photos) =>
                setHiveFormData({ ...hiveFormData, notePhotos: photos })
              }
              maxPhotos={5}
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
    gap: 6,
    padding: SPACING.sm,
  },
  rowActionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "500",
    color: COLORS.success,
  },
  hiveBox: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.sm,
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
    fontSize: 11,
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
});
