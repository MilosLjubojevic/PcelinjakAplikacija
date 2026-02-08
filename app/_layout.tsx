import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, View } from "react-native";
import { AppProvider } from "../context/AppContext";
import { SupabaseProvider } from "../context/SupabaseContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import ErrorBoundary from "../components/ErrorBoundary";
import LoginScreen from "../components/LoginScreen";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { COLORS } from "../constants/designTokens";

function AuthGate() {
  const { session, loading } = useAuth();

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
    <AppProvider>
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
              drawerLabel: "Pocetna",
              title: "Pcelinjak Ljubojevic",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="hive"
            options={{
              drawerLabel: "Kosnice",
              title: "Kosnice",
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
            name="nuclei"
            options={{
              drawerLabel: "Rojevi",
              title: "Rojevi",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="cube-outline" size={size} color={color} />
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
              drawerLabel: "Porudzbine",
              title: "Porudzbine",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="receipt-outline" size={size} color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="analytics"
            options={{
              drawerLabel: "Analitika",
              title: "Analitika",
              drawerIcon: ({ color, size }) => (
                <Ionicons name="bar-chart-outline" size={size} color={color} />
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
            name="google-auth"
            options={{
              drawerItemStyle: { display: "none" },
            }}
          />
        </Drawer>
      </SupabaseProvider>
    </AppProvider>
    </ErrorBoundary>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
