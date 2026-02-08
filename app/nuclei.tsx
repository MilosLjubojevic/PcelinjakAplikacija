import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useApp } from "../context/AppContext";
import { Nuclei, NucleiStatus } from "../types";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Picker, { PickerOption } from "../components/Picker";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

const statusOptions: PickerOption[] = [
  { label: "U razvoju", value: "developing" },
  { label: "Spreman", value: "ready" },
  { label: "Za prodaju", value: "for-sale" },
  { label: "Prodat", value: "sold" },
  { label: "Spojen", value: "merged" },
];

export default function NucleiScreen() {
  const { state, loading, addNuclei, updateNuclei, deleteNuclei } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNuclei, setEditingNuclei] = useState<Nuclei | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    status: "developing" as NucleiStatus,
    queenId: "",
    frameCount: "5",
    strength: "5",
    price: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      status: "developing",
      queenId: "",
      frameCount: "5",
      strength: "5",
      price: "",
      notes: "",
    });
    setEditingNuclei(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (nuclei: Nuclei) => {
    setEditingNuclei(nuclei);
    setFormData({
      name: nuclei.name,
      status: nuclei.status,
      queenId: nuclei.queenId || "",
      frameCount: nuclei.frameCount.toString(),
      strength: nuclei.strength.toString(),
      price: nuclei.price?.toString() || "",
      notes: nuclei.notes || "",
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Greška', 'Naziv roja je obavezan');
      return;
    }
    if (parseInt(formData.frameCount) < 1 || parseInt(formData.frameCount) > 30) {
      Alert.alert('Greška', 'Broj ramova mora biti između 1 i 30');
      return;
    }
    if (parseInt(formData.strength) < 1 || parseInt(formData.strength) > 10) {
      Alert.alert('Greška', 'Snaga mora biti između 1 i 10');
      return;
    }
    const nucleiData = {
      name: formData.name,
      status: formData.status,
      queenId: formData.queenId || undefined,
      frameCount: parseInt(formData.frameCount) || 5,
      strength: parseInt(formData.strength) || 5,
      price: formData.price ? parseFloat(formData.price) : undefined,
      notes: formData.notes || undefined,
    };

    if (editingNuclei) {
      await updateNuclei(editingNuclei.id, nucleiData);
    } else {
      const newNuclei: Nuclei = {
        id: Crypto.randomUUID(),
        ...nucleiData,
        createdDate: new Date(),
        readyDate: formData.status === "ready" || formData.status === "for-sale" ? new Date() : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await addNuclei(newNuclei);
    }

    setModalVisible(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const nucleiItem = state.nuclei.find(n => n.id === id);
    Alert.alert(
      'Potvrda brisanja',
      `Da li ste sigurni da želite obrisati ${nucleiItem?.name || 'ovaj roj'}?`,
      [
        { text: 'Otkaži', style: 'cancel' },
        { text: 'Obriši', style: 'destructive', onPress: () => deleteNuclei(id) },
      ]
    );
  };

  const getStatusColor = (status: NucleiStatus) => {
    switch (status) {
      case "for-sale":
        return COLORS.success;
      case "ready":
        return COLORS.primary;
      case "developing":
        return COLORS.info;
      case "sold":
        return COLORS.textMuted;
      case "merged":
        return COLORS.accent.nuclei;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusLabel = (status: NucleiStatus) => {
    return statusOptions.find((opt) => opt.value === status)?.label || status;
  };

  const getQueenName = (queenId?: string) => {
    if (!queenId) return null;
    const queen = state.queens.find((q) => q.id === queenId);
    return queen ? queen.name || `Matica ${queen.id.slice(-4)}` : "Nepoznata matica";
  };

  const queenOptions: PickerOption[] = [
    { label: "Bez matice", value: "" },
    ...state.queens.map((q) => ({
      label: q.name || `Matica ${q.id.slice(-4)}`,
      value: q.id,
    })),
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const filterByStatus = (status?: NucleiStatus) => {
    return status
      ? state.nuclei.filter((n) => n.status === status)
      : state.nuclei;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {state.nuclei.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="Nema rojeva"
            message="Dodajte prvi roj da biste započeli praćenje"
            actionLabel="Dodaj Roj"
            onAction={openAddModal}
          />
        ) : (
          <View style={styles.nucleiList}>
            {state.nuclei.map((nuclei) => (
              <Card key={nuclei.id} style={styles.nucleiCard}>
                <View style={styles.nucleiHeader}>
                  <View style={styles.nucleiTitleRow}>
                    <Text style={styles.nucleiName}>{nuclei.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(nuclei.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getStatusLabel(nuclei.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.nucleiActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(nuclei)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(nuclei.id)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.nucleiDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="copy" size={SPACING.lg} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      {nuclei.frameCount} ramova
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="flash" size={SPACING.lg} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      Snaga: {nuclei.strength}/10
                    </Text>
                  </View>
                  {nuclei.queenId && (
                    <View style={styles.detailRow}>
                      <Ionicons name="star" size={SPACING.lg} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>
                        {getQueenName(nuclei.queenId)}
                      </Text>
                    </View>
                  )}
                  {nuclei.price && (
                    <View style={styles.detailRow}>
                      <Ionicons name="cash" size={SPACING.lg} color={COLORS.textSecondary} />
                      <Text style={styles.priceText}>
                        {nuclei.price.toLocaleString('sr-RS')} KM
                      </Text>
                    </View>
                  )}
                  {nuclei.readyDate && (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={SPACING.lg} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>
                        Spreman: {formatDate(nuclei.readyDate)}
                      </Text>
                    </View>
                  )}
                  {nuclei.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesText}>{nuclei.notes}</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        title={editingNuclei ? "Izmeni Roj" : "Novi Roj"}
      >
        <Input
          label="Naziv"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Npr. Roj 1"
        />

        <Picker
          label="Status"
          value={formData.status}
          options={statusOptions}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value as NucleiStatus })
          }
        />

        <Picker
          label="Matica (opciono)"
          value={formData.queenId}
          options={queenOptions}
          onValueChange={(value) => setFormData({ ...formData, queenId: value })}
          placeholder="Izaberi maticu..."
        />

        <Input
          label="Broj ramova"
          value={formData.frameCount}
          onChangeText={(text) =>
            setFormData({ ...formData, frameCount: text })
          }
          placeholder="5"
          keyboardType="numeric"
        />

        <Input
          label="Snaga (1-10)"
          value={formData.strength}
          onChangeText={(text) =>
            setFormData({ ...formData, strength: text })
          }
          placeholder="5"
          keyboardType="numeric"
        />

        <Input
          label="Cena (KM, opciono)"
          value={formData.price}
          onChangeText={(text) => setFormData({ ...formData, price: text })}
          placeholder="15000"
          keyboardType="numeric"
        />

        <Input
          label="Beleske (opciono)"
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Dodatne informacije..."
          multiline
          numberOfLines={3}
        />

        <View style={styles.modalButtons}>
          <Button
            title="Otkazi"
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
            variant="secondary"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
          <Button
            title={editingNuclei ? "Sacuvaj" : "Dodaj"}
            onPress={handleSave}
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
  scrollView: {
    flex: 1,
  },
  nucleiList: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  nucleiCard: {
    marginBottom: SPACING.md,
  },
  nucleiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  nucleiTitleRow: {
    flex: 1,
    gap: SPACING.sm,
  },
  nucleiName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.surface,
  },
  nucleiActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  nucleiDetails: {
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  priceText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.success,
  },
  notesContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  notesText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  addButton: {
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
  modalButtons: {
    flexDirection: "row",
    marginTop: SPACING.sm,
  },
});
