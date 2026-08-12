import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AppText from "./AppText";
import { COLORS, FONT_SIZE, RADIUS, SHADOW, SPACING } from "../constants/designTokens";

interface ConfirmDiscardModalProps {
  visible: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function ConfirmDiscardModal({
  visible,
  onDiscard,
  onCancel,
}: ConfirmDiscardModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle" size={28} color="#835500" />
          </View>

          {/* Text */}
          <AppText style={styles.title}>Nesačuvane promjene</AppText>
          <AppText style={styles.message}>Da li želite da odbacite promjene?</AppText>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
              <AppText style={styles.cancelText}>Nastavi sa unosom</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.discardBtn} onPress={onDiscard} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={16} color={COLORS.surface} />
              <AppText style={styles.discardText}>Odbaci</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  dialog: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: "center",
    ...SHADOW.lg,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  message: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  buttons: {
    flexDirection: "row",
    gap: SPACING.md,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  cancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  discardBtn: {
    flex: 1,
    flexDirection: "row",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: {
    fontSize: FONT_SIZE.md,
    fontWeight: "700",
    color: COLORS.surface,
  },
});
