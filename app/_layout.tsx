import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";
import AppText from "../components/AppText";
import UpdateScreen from "../components/UpdateScreen";
import * as Updates from "expo-updates";
import { requestNotificationPermissions } from "../utils/notifications";
import { AppProvider } from "../context/AppContext";
import { SupabaseProvider } from "../context/SupabaseContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import ErrorBoundary from "../components/ErrorBoundary";
import LoginScreen from "../components/LoginScreen";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { COLORS } from "../constants/designTokens";
import { DEV_MODE } from "../constants/devMode";

function AuthGate() {
  const { session, loading } = useAuth();

  // Ask for notification permission once after login
  useEffect(() => {
    if (session) {
      requestNotificationPermissions().catch(() => {});
    }
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <ErrorBoundary>
    <ToastProvider>
    <AppProvider>
      {DEV_MODE && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, backgroundColor: '#FF6B00', paddingVertical: 3, alignItems: 'center' }}>
          <AppText style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 }} maxFontSizeMultiplier={1}>⚠ DEV MODE — MOCK DATA</AppText>
        </View>
      )}
      <SupabaseProvider>
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            drawerStyle: {
              backgroundColor: COLORS.background,
              width: 280,
            },
            drawerActiveTintColor: COLORS.primary,
            drawerInactiveTintColor: COLORS.textSecondary,
            drawerLabelStyle: {
              fontSize: 15,
              fontWeight: "500",
            },
            headerStyle: {
              backgroundColor: COLORS.surface,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            },
            headerTintColor: COLORS.textPrimary,
            headerTitleStyle: {
              fontWeight: "600",
              fontSize: 17,
            },
          }}
        >
          <Drawer.Screen
            name="index"
            options={{
              drawerLabel: "Početna",
              title: "Pčelinjak Ljubojević",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="hive"
            options={{
              drawerLabel: "Košnice",
              title: "Košnice",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="queens"
            options={{
              drawerLabel: "Matice",
              title: "Matice",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="star-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="finansije"
            options={{
              drawerLabel: "Finansije",
              title: "Finansije",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="wallet-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="products"
            options={{
              drawerLabel: "Proizvodi",
              title: "Proizvodi",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="pricetag-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="orders"
            options={{
              drawerLabel: "Porudžbine",
              title: "Porudžbine",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="biljeske"
            options={{
              drawerLabel: "Bilješke",
              title: "Bilješke",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="document-text-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="polen"
            options={{
              drawerLabel: "Polen",
              title: "Polen",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="flower-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="admin"
            options={{
              drawerLabel: "Admin",
              title: "Upravljanje Pristupom",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="shield-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="pregled"
            options={{
              drawerItemStyle: { display: "none" },
              title: "Košnice za pregled",
            }}
          />
          <Drawer.Screen
            name="google-auth"
            options={{
              drawerItemStyle: { display: "none" },
            }}
          />
        </Drawer>
      </SupabaseProvider>
    </AppProvider>
    </ToastProvider>
    </ErrorBoundary>
  );
}

type UpdatePhase = "checking" | "downloading" | "installing" | null;

export default function Layout() {
  const [updatePhase, setUpdatePhase] = useState<UpdatePhase>(null);

  useEffect(() => {
    if (__DEV__) return;

    (async () => {
      try {
        setUpdatePhase("checking");
        const { isAvailable } = await Updates.checkForUpdateAsync();

        if (!isAvailable) {
          setUpdatePhase(null);
          return;
        }

        setUpdatePhase("downloading");
        await Updates.fetchUpdateAsync();

        setUpdatePhase("installing");
        await Updates.reloadAsync();
      } catch {
        setUpdatePhase(null);
      }
    })();
  }, []);

  if (updatePhase !== null) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <UpdateScreen phase={updatePhase} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
