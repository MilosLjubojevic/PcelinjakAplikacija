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
import SearchBar from "../components/SearchBar";
import { formatDate } from "../utils/dateUtils";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW, commonStyles } from "../constants/designTokens";
import { useApp } from "../context/AppContext";
import { Note } from "../types";

export default function BiljeskeScreen() {
  const { state, addNote, updateNote, deleteNote } = useApp();
  const notes = state.notes || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    date: new Date() as Date | null,
  });

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  // Sort by date descending
  const sortedNotes = useMemo(
    () => [...filteredNotes].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [filteredNotes]
  );

  const resetForm = () => {
    setFormData({ title: "", content: "", date: new Date() });
    setEditingNote(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      date: note.date,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Greška", "Naslov je obavezan.");
      return;
    }
    if (!formData.date) {
      Alert.alert("Greška", "Datum je obavezan.");
      return;
    }

    const now = new Date();

    if (editingNote) {
      await updateNote(editingNote.id, {
        title: formData.title.trim(),
        content: formData.content.trim(),
        date: formData.date!,
      });
    } else {
      const newNote: Note = {
        id: Crypto.randomUUID(),
        title: formData.title.trim(),
        content: formData.content.trim(),
        date: formData.date,
        createdAt: now,
        updatedAt: now,
      };
      await addNote(newNote);
    }

    closeModal();
  };

  const handleDelete = (note: Note) => {
    Alert.alert(
      "Obriši bilješku",
      `Da li ste sigurni da želite obrisati "${note.title}"?`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Obriši",
          style: "destructive",
          onPress: () => deleteNote(note.id),
        },
      ]
    );
  };

  return (
    <View style={commonStyles.screen}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Pretraži bilješke..."
      />

      {sortedNotes.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={searchQuery ? "Nema rezultata" : "Nema bilješki"}
          message={
            searchQuery
              ? "Pokušajte sa drugim pojmom za pretragu."
              : "Dodajte svoju prvu bilješku pritiskom na dugme ispod."
          }
          actionLabel={searchQuery ? undefined : "Dodaj bilješku"}
          onAction={searchQuery ? undefined : openAddModal}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {sortedNotes.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={styles.noteCard}
              onPress={() => openEditModal(note)}
              activeOpacity={0.7}
            >
              <View style={styles.noteHeader}>
                <View style={styles.noteTitleRow}>
                  <Ionicons
                    name="document-text"
                    size={20}
                    color={COLORS.primary}
                    style={styles.noteIcon}
                  />
                  <Text style={styles.noteTitle} numberOfLines={1}>
                    {note.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(note)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              {note.content.length > 0 && (
                <Text style={styles.noteContent} numberOfLines={3}>
                  {note.content}
                </Text>
              )}

              <View style={styles.noteFooter}>
                <View style={styles.dateBadge}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={COLORS.primaryDark}
                  />
                  <Text style={styles.dateText}>{formatDate(note.date)}</Text>
                </View>
                {note.updatedAt.getTime() !== note.createdAt.getTime() && (
                  <Text style={styles.editedText}>Izmijenjeno</Text>
                )}
              </View>
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
        title={editingNote ? "Uredi bilješku" : "Nova bilješka"}
      >
        <Input
          label="Naslov"
          value={formData.title}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
          placeholder="Unesite naslov..."
        />
        <Input
          label="Sadržaj"
          value={formData.content}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, content: text }))}
          placeholder="Unesite sadržaj bilješke..."
          multiline
          numberOfLines={5}
        />
        <DatePicker
          label="Datum"
          value={formData.date}
          onChange={(date) => setFormData((prev) => ({ ...prev, date }))}
        />

        <View style={commonStyles.modalButtons}>
          <Button
            title="Otkaži"
            onPress={closeModal}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <Button
            title={editingNote ? "Sačuvaj" : "Dodaj"}
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  noteCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  noteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.sm,
  },
  noteIcon: {
    marginRight: SPACING.sm,
  },
  noteTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  noteContent: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent.hiveLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  editedText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontStyle: "italic",
  },
});
