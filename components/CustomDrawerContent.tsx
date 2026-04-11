import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useAuth } from "../context/AuthContext";
import { COLORS, SPACING, FONT_SIZE } from "../constants/designTokens";

export default function CustomDrawerContent(props: any) {
  const { signOut, user } = useAuth();

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={styles.footer}>
        {user?.email && (
          <Text style={styles.emailText} numberOfLines={1}>
            {user.email}
          </Text>
        )}
        <DrawerItem
          label="Odjavi se"
          icon={({ size }) => (
            <Ionicons name="log-out-outline" size={size} color={COLORS.danger} />
          )}
          onPress={signOut}
          labelStyle={styles.signOutLabel}
        />
        <Text style={styles.versionText}>
          v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: SPACING.xl,
  },
  emailText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  signOutLabel: {
    color: COLORS.danger,
    fontWeight: "600",
  },
  versionText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingBottom: SPACING.sm,
  },
});
