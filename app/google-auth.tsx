import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../utils/supabase";

export default function GoogleAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const handleCallback = async () => {
      if (params.code) {
        try {
          await supabase.auth.exchangeCodeForSession(params.code);
        } catch (error) {
          console.error("Error exchanging code:", error);
        }
      }
      router.replace("/");
    };

    handleCallback();
  }, [params.code]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF8E7" }}>
      <ActivityIndicator size="large" color="#FFB800" />
    </View>
  );
}
