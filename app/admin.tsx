import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSupabase } from "../context/SupabaseContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";

export default function AdminScreen() {
  const {
    allowedEmails,
    allowedEmailsLoading,
    allowedEmailsError,
    fetchAllowedEmails,
    addAllowedEmail,
    deleteAllowedEmail,
  } = useSupabase();

  const [modalVisible, setModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllowedEmails();
  }, []);

  const handleAdd = async () => {
    const trimmed = newEmail.trim().toLowerCase();

    if (!trimmed) {
      setEmailError("Email je obavezan");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Unesite validan email");
      return;
    }

    if (allowedEmails.some((e) => e.email === trimmed)) {
      setEmailError("Ovaj email vec postoji");
      return;
    }

    setSaving(true);
    const result = await addAllowedEmail(trimmed);
    setSaving(false);

    if (result) {
      setNewEmail("");
      setEmailError("");
      setModalVisible(false);
    } else {
      Alert.alert("Greska", "Nije moguce dodati email. Pokusajte ponovo.");
    }
  };

  const handleDelete = (id: number, email: string) => {
    Alert.alert(
      "Ukloni Email",
      `Da li ste sigurni da zelite da uklonite "${email}"?\n\nOva osoba vise nece moci da se prijavi.`,
      [
        { text: "Otkazi", style: "cancel" },
        {
          text: "Ukloni",
          style: "destructive",
          onPress: async () => {
            const success = await deleteAllowedEmail(id);
            if (!success) {
              Alert.alert("Greska", "Nije moguce ukloniti email.");
            }
          },
        },
      ]
    );
  };

  if (allowedEmailsLoading && allowedEmails.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (allowedEmailsError) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>{allowedEmailsError}</Text>
        <Button title="Pokusaj ponovo" onPress={fetchAllowedEmails} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="mail" size={24} color={COLORS.primary} />
          <Text style={styles.summaryText}>
            Ukupno dozvoljenih email-ova:{" "}
            <Text style={styles.summaryCount}>{allowedEmails.length}</Text>
          </Text>
        </View>
      </Card>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {allowedEmails.length === 0 ? (
          <EmptyState
            icon="mail-outline"
            title="Nema email-ova"
            message="Dodajte email adrese korisnika kojima zelite da omogucite pristup aplikaciji."
            actionLabel="Dodaj Email"
            onAction={() => setModalVisible(true)}
          />
        ) : (
          allowedEmails.map((item) => (
            <Card key={item.id} style={styles.emailCard}>
              <View style={styles.emailRow}>
                <View style={styles.emailInfo}>
                  <Ionicons name="person-circle-outline" size={32} color={COLORS.primaryDark} />
                  <View style={styles.emailTextContainer}>
                    <Text style={styles.emailText}>{item.email}</Text>
                    <Text style={styles.dateText}>
                      Dodato: {new Date(item.created_at).toLocaleDateString("sr-RS")}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.email)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setNewEmail("");
          setEmailError("");
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color={COLORS.surface} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Dodaj Email"
      >
        <Input
          label="Email adresa"
          placeholder="korisnik@example.com"
          value={newEmail}
          onChangeText={(text) => {
            setNewEmail(text);
            setEmailError("");
          }}
          error={emailError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          title="Dodaj"
          onPress={handleAdd}
          loading={saving}
          disabled={saving}
        />
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
    padding: SPACING.xxxl,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.danger,
    textAlign: "center",
    marginVertical: SPACING.lg,
  },
  summaryCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  summaryText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primaryDark,
  },
  summaryCount: {
    fontWeight: "bold",
    fontSize: FONT_SIZE.lg,
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },
  emailCard: {
    marginBottom: SPACING.md,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
  },
  emailTextContainer: {
    flex: 1,
  },
  emailText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    padding: SPACING.sm,
  },
  fab: {
    position: "absolute",
    right: SPACING.xl,
    bottom: SPACING.xxxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.fab,
  },
});
