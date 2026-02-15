import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useApp } from "../context/AppContext";
import { QueenBox, QueenBoxRow, QueenBoxHealth, QueenBoxStatus, QueenBoxLocation } from "../types";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Picker, { PickerOption } from "../components/Picker";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import DatePicker from "../components/DatePicker";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

const healthOptions: PickerOption[] = [
  { label: "Dobro", value: "good" },
  { label: "Zahtijeva Paznju", value: "warning" },
];

const statusOptions: PickerOption[] = [
  { label: "Prazna", value: "empty" },
  { label: "U razvoju", value: "developing" },
  { label: "Zrela", value: "mature" },
];

const locationOptions: PickerOption[] = [
  { label: "Kuca", value: "kuca" },
  { label: "Suma", value: "suma" },
];

export default function QueensScreen() {
  const { state, loading, addQueenBoxRow, updateQueenBoxRow, deleteQueenBoxRow } = useApp();
  const [selectedLocation, setSelectedLocation] = useState<QueenBoxLocation>("kuca");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [addRowModalVisible, setAddRowModalVisible] = useState(false);
  const [editBoxModalVisible, setEditBoxModalVisible] = useState(false);
  const [editingBox, setEditingBox] = useState<QueenBox | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    rowName: "",
    startNumber: "",
    endNumber: "",
    location: "kuca" as QueenBoxLocation,
  });
  const [saving, setSaving] = useState(false);
  const [boxFormData, setBoxFormData] = useState({
    health: "good" as QueenBoxHealth,
    status: "empty" as QueenBoxStatus,
    displayNumber: "",
    startDate: null as Date | null,
    notes: "",
  });

  const queenBoxRows = state.queenBoxRows || [];
  const filteredRows = queenBoxRows.filter((row) => row.location === selectedLocation);

  const resetForm = () => {
    setFormData({
      rowName: "",
      startNumber: "",
      endNumber: "",
      location: selectedLocation,
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
    setFormData((prev) => ({ ...prev, location: selectedLocation }));
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
    if (!formData.rowName || !formData.startNumber || !formData.endNumber) {
      return;
    }

    const startNum = parseInt(formData.startNumber);
    const endNum = parseInt(formData.endNumber);
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum || startNum < 1) {
      Alert.alert("Greska", "Unesite validne brojeve (pocetni mora biti manji od krajnjeg).");
      return;
    }
    setSaving(true);

    const now = new Date();
    const newRowId = Crypto.randomUUID();

    // Create boxes for the new row with custom numbering
    const newBoxes: QueenBox[] = [];
    for (let num = startNum; num <= endNum; num++) {
      newBoxes.push({
        id: Crypto.randomUUID(),
        number: num,
        rowId: newRowId,
        health: "good" as const,
        status: "empty" as const,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create new row
    const newRow: QueenBoxRow = {
      id: newRowId,
      name: formData.rowName,
      location: formData.location,
      queenBoxes: newBoxes,
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

  const handleSaveBox = async () => {
    if (!editingBox || !editingRowId) return;

    const row = queenBoxRows.find((r) => r.id === editingRowId);
    if (!row) return;
    setSaving(true);

    const startDate = boxFormData.startDate || undefined;
    const newNumber = parseInt(boxFormData.displayNumber);

    if (isNaN(newNumber) || newNumber < 1) {
      Alert.alert("Greska", "Unesite validan broj kutije.");
      return;
    }

    // Calculate maturity date (21 days from start)
    const maturityDate = startDate
      ? new Date(startDate.getTime() + 21 * 24 * 60 * 60 * 1000)
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

  const handleDeleteRow = (rowId: string, rowName: string) => {
    Alert.alert(
      "Obrisi Red",
      `Da li ste sigurni da zelite da obrisete "${rowName}" i sve kutije u njemu?`,
      [
        { text: "Otkazi", style: "cancel" },
        {
          text: "Obrisi",
          style: "destructive",
          onPress: () => deleteQueenBoxRow(rowId),
        },
      ]
    );
  };

  const handleAddBoxToRow = async (rowId: string) => {
    const row = queenBoxRows.find((r) => r.id === rowId);
    if (!row) return;

    // Find the highest number in the row and add 1
    const maxNumber = row.queenBoxes.length > 0
      ? Math.max(...row.queenBoxes.map((b) => b.number))
      : 0;

    const now = new Date();
    const newBox: QueenBox = {
      id: Crypto.randomUUID(),
      number: maxNumber + 1,
      rowId: rowId,
      health: "good",
      status: "empty",
      createdAt: now,
      updatedAt: now,
    };

    await updateQueenBoxRow(rowId, {
      queenBoxes: [...row.queenBoxes, newBox],
    });
  };

  const handleRemoveBox = (rowId: string, boxId: string, boxNumber: number) => {
    const row = queenBoxRows.find((r) => r.id === rowId);
    if (!row) return;

    if (row.queenBoxes.length <= 1) {
      Alert.alert("Greska", "Red mora imati barem jednu kutiju.");
      return;
    }

    Alert.alert(
      "Obrisi Kutiju",
      `Da li ste sigurni da zelite da obrisete kutiju ${boxNumber}?`,
      [
        { text: "Otkazi", style: "cancel" },
        {
          text: "Obrisi",
          style: "destructive",
          onPress: async () => {
            const updatedBoxes = row.queenBoxes.filter((b) => b.id !== boxId);
            await updateQueenBoxRow(rowId, { queenBoxes: updatedBoxes });
          },
        },
      ]
    );
  };

  // Quick status toggle: empty -> developing -> mature -> empty
  const handleQuickStatusToggle = async (rowId: string, box: QueenBox) => {
    const row = queenBoxRows.find((r) => r.id === rowId);
    if (!row) return;

    let newStatus: QueenBoxStatus;
    let newStartDate = box.startDate;

    if (box.status === "empty") {
      newStatus = "developing";
      newStartDate = new Date(); // Set start date when starting development
    } else if (box.status === "developing") {
      newStatus = "mature";
    } else {
      newStatus = "empty";
      newStartDate = undefined; // Clear start date when resetting to empty
    }

    const updatedBox: QueenBox = {
      ...box,
      status: newStatus,
      startDate: newStartDate,
      updatedAt: new Date(),
    };

    const updatedBoxes = row.queenBoxes.map((b) =>
      b.id === box.id ? updatedBox : b
    );

    await updateQueenBoxRow(rowId, { queenBoxes: updatedBoxes });
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
    const maturityDate = new Date(startDate.getTime() + 21 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const daysLeft = Math.ceil((maturityDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  const getRowStats = (boxes: QueenBox[]) => {
    const empty = boxes.filter((b) => b.status === "empty").length;
    const developing = boxes.filter((b) => b.status === "developing").length;
    const mature = boxes.filter((b) => b.status === "mature").length;
    return { empty, developing, mature, total: boxes.length };
  };

  const getLocationStats = (location: QueenBoxLocation) => {
    const rows = queenBoxRows.filter((r) => r.location === location);
    const totalBoxes = rows.reduce((sum, r) => sum + r.queenBoxes.length, 0);
    const developing = rows.reduce(
      (sum, r) => sum + r.queenBoxes.filter((b) => b.status === "developing").length,
      0
    );
    const mature = rows.reduce(
      (sum, r) => sum + r.queenBoxes.filter((b) => b.status === "mature").length,
      0
    );
    return { totalRows: rows.length, totalBoxes, developing, mature };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Učitavanje...</Text>
      </View>
    );
  }

  const kucaStats = getLocationStats("kuca");
  const sumaStats = getLocationStats("suma");

  return (
    <View style={styles.container}>
      {/* Location Selector */}
      <View style={styles.locationSelector}>
        <TouchableOpacity
          style={[
            styles.locationButton,
            selectedLocation === "kuca" && styles.locationButtonActive,
          ]}
          onPress={() => setSelectedLocation("kuca")}
        >
          <Ionicons
            name="home"
            size={24}
            color={selectedLocation === "kuca" ? COLORS.surface : COLORS.textPrimary}
          />
          <View style={styles.locationInfo}>
            <Text
              style={[
                styles.locationName,
                selectedLocation === "kuca" && styles.locationNameActive,
              ]}
            >
              Kuca
            </Text>
            <Text
              style={[
                styles.locationStats,
                selectedLocation === "kuca" && styles.locationStatsActive,
              ]}
            >
              {kucaStats.totalRows} redova • {kucaStats.totalBoxes} kutija
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.locationButton,
            selectedLocation === "suma" && styles.locationButtonActive,
          ]}
          onPress={() => setSelectedLocation("suma")}
        >
          <Ionicons
            name="leaf"
            size={24}
            color={selectedLocation === "suma" ? COLORS.surface : COLORS.textPrimary}
          />
          <View style={styles.locationInfo}>
            <Text
              style={[
                styles.locationName,
                selectedLocation === "suma" && styles.locationNameActive,
              ]}
            >
              Suma
            </Text>
            <Text
              style={[
                styles.locationStats,
                selectedLocation === "suma" && styles.locationStatsActive,
              ]}
            >
              {sumaStats.totalRows} redova • {sumaStats.totalBoxes} kutija
            </Text>
          </View>
        </TouchableOpacity>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredRows.length === 0 ? (
          <EmptyState
            icon="star-outline"
            title="Nema redova"
            message={`Dodajte prvi red kutija za lokaciju ${selectedLocation === "kuca" ? "Kuca" : "Suma"}`}
            actionLabel="Dodaj Red"
            onAction={openAddModal}
          />
        ) : (
          filteredRows.map((row) => {
            const isExpanded = expandedRows.includes(row.id);
            const stats = getRowStats(row.queenBoxes);
            const sortedBoxes = [...row.queenBoxes].sort((a, b) => a.number - b.number);

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
                      size={24}
                      color={COLORS.textPrimary}
                    />
                    <Text style={styles.rowName}>{row.name}</Text>
                    <View style={styles.rowBadge}>
                      <Text style={styles.rowBadgeText}>{stats.total}</Text>
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.quickStats}>
                    <View style={styles.statDot}>
                      <View style={[styles.dot, { backgroundColor: COLORS.textMuted }]} />
                      <Text style={styles.statNumber}>{stats.empty}</Text>
                    </View>
                    <View style={styles.statDot}>
                      <View style={[styles.dot, { backgroundColor: COLORS.info }]} />
                      <Text style={styles.statNumber}>{stats.developing}</Text>
                    </View>
                    <View style={styles.statDot}>
                      <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                      <Text style={styles.statNumber}>{stats.mature}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Boxes Grid (shown when expanded) */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.boxesGrid}>
                      {sortedBoxes.map((box) => {
                        const daysUntilMature = calculateDaysUntilMature(box);

                        return (
                          <TouchableOpacity
                            key={box.id}
                            style={[
                              styles.queenBox,
                              { borderColor: box.status === "mature" ? COLORS.success : getHealthColor(box.health) },
                              box.status === "empty" && styles.queenBoxEmpty,
                              box.status === "mature" && styles.queenBoxMature,
                            ]}
                            onPress={() => handleQuickStatusToggle(row.id, box)}
                            onLongPress={() => openEditBoxModal(box, row.id)}
                          >
                            <Text style={styles.boxNumber}>{box.number}</Text>

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
                                <Text style={styles.daysText}>{daysUntilMature}d</Text>
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
                    </View>

                    {/* Row Actions */}
                    <View style={styles.rowActions}>
                      <TouchableOpacity
                        style={styles.rowActionButton}
                        onPress={() => handleAddBoxToRow(row.id)}
                      >
                        <Ionicons name="add-circle-outline" size={20} color={COLORS.success} />
                        <Text style={styles.rowActionText}>Dodaj kutiju</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rowActionButton}
                        onPress={() => handleDeleteRow(row.id, row.name)}
                      >
                        <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                        <Text style={[styles.rowActionText, { color: COLORS.danger }]}>
                          Obrisi red
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={28} color={COLORS.surface} />
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
          placeholder="Npr. Red 1, Red A..."
        />

        <Picker
          label="Lokacija"
          value={formData.location}
          options={locationOptions}
          onValueChange={(value) =>
            setFormData({ ...formData, location: value as QueenBoxLocation })
          }
        />

        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <Input
              label="Od broja"
              value={formData.startNumber}
              onChangeText={(text) => setFormData({ ...formData, startNumber: text })}
              placeholder="Npr. 1"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.formHalf}>
            <Input
              label="Do broja"
              value={formData.endNumber}
              onChangeText={(text) => setFormData({ ...formData, endNumber: text })}
              placeholder="Npr. 50"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Bice kreirano{" "}
            {formData.startNumber && formData.endNumber
              ? Math.max(0, parseInt(formData.endNumber) - parseInt(formData.startNumber) + 1) || 0
              : 0}{" "}
            kutija sa brojevima od {formData.startNumber || "?"} do {formData.endNumber || "?"}.
          </Text>
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkazi"
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
            disabled={!formData.rowName || !formData.startNumber || !formData.endNumber}
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
        title={`Kutija ${editingBox?.number || ""}`}
      >
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Informacije</Text>

          <Input
            label="Broj kutije"
            value={boxFormData.displayNumber}
            onChangeText={(text) =>
              setBoxFormData({ ...boxFormData, displayNumber: text })
            }
            placeholder="Npr. 125"
            keyboardType="numeric"
          />

          <Picker
            label="Status kutije"
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
            label="Datum pocetka (kada je maticnjak postavljen)"
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
                Matica ce biti zrela:{" "}
                {formatDate(
                  new Date(
                    boxFormData.startDate.getTime() + 21 * 24 * 60 * 60 * 1000
                  )
                )}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <Input
            label="Beleske (opciono)"
            value={boxFormData.notes}
            onChangeText={(text) =>
              setBoxFormData({ ...boxFormData, notes: text })
            }
            placeholder="Dodatne informacije..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.modalButtons}>
          <Button
            title="Otkazi"
            onPress={() => {
              setEditBoxModalVisible(false);
              resetBoxForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title="Sacuvaj"
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
    width: 55,
    height: 55,
    borderRadius: 10,
    borderWidth: 3,
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
    color: COLORS.textSecondary,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
  formRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  formHalf: {
    flex: 1,
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
});
