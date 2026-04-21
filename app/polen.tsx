import React, { useState, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import DatePicker from "../components/DatePicker";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, commonStyles } from "../constants/designTokens";
import { useApp } from "../context/AppContext";
import { PolenHarvest } from "../types";

export default function PolenScreen() {
  const { state, addPolenHarvest, updatePolenHarvest, deletePolenHarvest } = useApp();
  const harvests = state.polenHarvests || [];

  const [modalVisible, setModalVisible] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<PolenHarvest | null>(null);
  const [formData, setFormData] = useState({
    date: new Date() as Date | null,
    weightGrams: "",
    notes: "",
  });

  const sortedHarvests = useMemo(
    () => [...harvests].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [harvests]
  );

  const currentYear = new Date().getFullYear();
  const yearStats = useMemo(() => {
    const thisYear = harvests.filter(h => h.date.getFullYear() === currentYear);
    const total = thisYear.reduce((sum, h) => sum + h.weightGrams, 0);
    return { count: thisYear.length, totalGrams: total };
  }, [harvests, currentYear]);

  const resetForm = () => {
    setFormData({ date: new Date(), weightGrams: "", notes: "" });
    setEditingHarvest(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (harvest: PolenHarvest) => {
    setEditingHarvest(harvest);
    setFormData({
      date: harvest.date,
      weightGrams: String(harvest.weightGrams),
      notes: harvest.notes ?? "",
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.date) {
      Alert.alert("Greška", "Datum je obavezan.");
      return;
    }
    const weight = parseFloat(formData.weightGrams.replace(",", "."));
    if (isNaN(weight) || weight <= 0) {
      Alert.alert("Greška", "Unesite ispravnu težinu (u gramima).");
      return;
    }

    const now = new Date();

    if (editingHarvest) {
      await updatePolenHarvest(editingHarvest.id, {
        date: formData.date,
        weightGrams: weight,
        notes: formData.notes.trim() || undefined,
        updatedAt: now,
      });
    } else {
      const newHarvest: PolenHarvest = {
        id: Crypto.randomUUID(),
        date: formData.date,
        weightGrams: weight,
        notes: formData.notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await addPolenHarvest(newHarvest);
    }

    closeModal();
  };

  const handleDelete = (harvest: PolenHarvest) => {
    Alert.alert(
      "Obriši berbu",
      `Da li ste sigurni da želite obrisati berbu od ${formatDate(harvest.date)}?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: () => deletePolenHarvest(harvest.id),
        },
      ]
    );
  };

  const formatWeight = (grams: number) => {
    return `${(grams / 1000).toFixed(2).replace(".", ",")} kg`;
  };

  return (
    <View style={commonStyles.screen}>
      {/* Year summary banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Ionicons name="flower-outline" size={22} color={COLORS.primary} />
          <Text style={styles.summaryValue}>{yearStats.count}</Text>
          <Text style={styles.summaryLabel}>berbi {currentYear}.</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="scale-outline" size={22} color={COLORS.primary} />
          <Text style={styles.summaryValue}>{formatWeight(yearStats.totalGrams)}</Text>
          <Text style={styles.summaryLabel}>ukupno {currentYear}.</Text>
        </View>
      </View>

      {sortedHarvests.length === 0 ? (
        <EmptyState
          icon="flower-outline"
          title="Nema podataka o unosu polena"
          message="Dodaj prvi unos polena pritiskom na dugme ispod."
          actionLabel="Dodaj unos polena"
          onAction={openAddModal}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sortedHarvests.map((harvest) => (
            <TouchableOpacity
              key={harvest.id}
              style={styles.card}
              onPress={() => openEditModal(harvest)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="flower" size={20} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.weightText}>{formatWeight(harvest.weightGrams)}</Text>
                    <View style={styles.dateBadge}>
                      <Ionicons name="calendar-outline" size={13} color={COLORS.primaryDark} />
                      <Text style={styles.dateText}>{formatDate(harvest.date)}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(harvest)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              {harvest.notes ? (
                <Text style={styles.notesText} numberOfLines={2}>
                  {harvest.notes}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={commonStyles.fab}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </TouchableOpacity>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title={editingHarvest ? "Uredi berbu polena" : "Nova berba polena"}
      >
        <DatePicker
          label="Datum berbe"
          value={formData.date}
          onChange={(date) => setFormData((prev) => ({ ...prev, date }))}
        />
        <Input
          label="Težina (g)"
          value={formData.weightGrams}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, weightGrams: text }))}
          placeholder="npr. 250"
          keyboardType="numeric"
        />
        <Input
          label="Napomena (opcionalno)"
          value={formData.notes}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
          placeholder="Dodajte napomenu..."
          multiline
          numberOfLines={3}
        />

        <View style={commonStyles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={closeModal}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <Button
            title={editingHarvest ? "Sačuvaj" : "Dodaj"}
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryBanner: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: "center",
    justifyContent: "space-around",
    ...SHADOW.sm,
  },
  summaryItem: {
    alignItems: "center",
    gap: SPACING.xs,
    flex: 1,
  },
  summaryValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent.hiveLight,
    alignItems: "center",
    justifyContent: "center",
  },
  weightText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  notesText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});
