import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import AppText from "../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSupabase } from "../context/SupabaseContext";
import { useApp } from "../context/AppContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOW } from "../constants/designTokens";
import {
  requestNotificationPermissions,
  scheduleInspectionNotifications,
  cancelAllInspectionNotifications,
} from "../utils/notifications";

const NOTIF_KEY = "@notifications_enabled";
const NOTIF_TIME_KEY = "@notifications_time";

export default function AdminScreen() {
  const {
    allowedEmails,
    allowedEmailsLoading,
    allowedEmailsError,
    fetchAllowedEmails,
    addAllowedEmail,
    deleteAllowedEmail,
  } = useSupabase();
  const { state } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [saving, setSaving] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifTime, setNotifTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    fetchAllowedEmails();
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(NOTIF_KEY),
      AsyncStorage.getItem(NOTIF_TIME_KEY),
    ]).then(([enabled, time]) => {
      setNotificationsEnabled(enabled !== "false");
      if (time) {
        const [h, m] = time.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        setNotifTime(d);
      }
      setNotifLoading(false);
    });
  }, []);

  const handleNotifToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(NOTIF_KEY, value ? "true" : "false");

    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Dozvola odbijena",
          "Omogućite notifikacije u podešavanjima uređaja da biste primali podsjetnik za pregled košnica."
        );
        setNotificationsEnabled(false);
        await AsyncStorage.setItem(NOTIF_KEY, "false");
        return;
      }
      await scheduleInspectionNotifications(state.locations, notifTime.getHours(), notifTime.getMinutes());
    } else {
      await cancelAllInspectionNotifications();
    }
  };

  const handleTimeChange = async (_: any, selected?: Date) => {
    setShowTimePicker(false);
    if (!selected) return;
    setNotifTime(selected);
    const h = selected.getHours();
    const m = selected.getMinutes();
    await AsyncStorage.setItem(NOTIF_TIME_KEY, `${h}:${m}`);
    if (notificationsEnabled) {
      await scheduleInspectionNotifications(state.locations, h, m);
    }
  };

  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

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
      setEmailError("Ovaj email već postoji");
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
      Alert.alert("Greška", "Nije moguće dodati email. Pokušajte ponovo.");
    }
  };

  const handleDelete = (id: number, email: string) => {
    Alert.alert(
      "Ukloni Email",
      `Da li ste sigurni da želite da uklonite "${email}"?\n\nOva osoba više neće moći da se prijavi.`,
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Ukloni",
          style: "destructive",
          onPress: async () => {
            const success = await deleteAllowedEmail(id);
            if (!success) {
              Alert.alert("Greška", "Nije moguće ukloniti email.");
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
        <AppText style={styles.loadingText}>Učitavanje...</AppText>
      </View>
    );
  }

  if (allowedEmailsError) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <AppText style={styles.errorText}>{allowedEmailsError}</AppText>
        <Button title="Pokušaj ponovo" onPress={fetchAllowedEmails} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="mail" size={24} color={COLORS.primary} />
          <AppText style={styles.summaryText}>
            Ukupno dozvoljenih email-ova:{" "}
            <AppText style={styles.summaryCount}>{allowedEmails.length}</AppText>
          </AppText>
        </View>
      </Card>

      <Card style={styles.notifCard}>
        <View style={styles.notifRow}>
          <View style={styles.notifInfo}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
            <View style={styles.notifTextContainer}>
              <AppText style={styles.notifTitle}>Notifikacije za pregled</AppText>
              <AppText style={styles.notifSubtitle}>
                Podsjetnik za zakazane preglede košnica
              </AppText>
            </View>
          </View>
          {notifLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotifToggle}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.surface}
            />
          )}
        </View>

        {!notifLoading && (
          <TouchableOpacity
            style={[styles.timeRow, !notificationsEnabled && styles.timeRowDisabled]}
            onPress={() => notificationsEnabled && setShowTimePicker(true)}
            activeOpacity={notificationsEnabled ? 0.7 : 1}
          >
            <Ionicons name="time-outline" size={20} color={notificationsEnabled ? COLORS.textSecondary : COLORS.textMuted} />
            <AppText style={[styles.timeLabel, !notificationsEnabled && styles.timeLabelDisabled]}>
              Vrijeme slanja
            </AppText>
            <AppText style={[styles.timeValue, !notificationsEnabled && styles.timeLabelDisabled]}>
              {formatTime(notifTime)}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={notificationsEnabled ? COLORS.textMuted : COLORS.border} />
          </TouchableOpacity>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={notifTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </Card>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {allowedEmails.length === 0 ? (
          <EmptyState
            icon="mail-outline"
            title="Nema email-ova"
            message="Dodajte email adrese korisnika kojima želite da omogućite pristup aplikaciji."
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
                    <AppText style={styles.emailText}>{item.email}</AppText>
                    <AppText style={styles.dateText}>
                      Dodato: {new Date(item.created_at).toLocaleDateString("sr-RS")}
                    </AppText>
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
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
  notifCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
  },
  notifTextContainer: {
    flex: 1,
  },
  notifTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  notifSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timeRowDisabled: {
    opacity: 0.4,
  },
  timeLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  timeValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.primary,
  },
  timeLabelDisabled: {
    color: COLORS.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 80,
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
