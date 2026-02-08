import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { COLORS, SPACING, FONT_SIZE } from "../constants/designTokens";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(
        "Greska pri prijavljivanju",
        error.message || "Doslo je do greske. Pokusajte ponovo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="flower" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Pcelinjak Ljubojevic</Text>
        <Text style={styles.subtitle}>
          Prijavite se da pristupite aplikaciji
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? "Prijavljivanje..." : "Prijavi se sa Google"}
          onPress={handleGoogleSignIn}
          disabled={loading}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xxl,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent.hiveLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 320,
  },
});
