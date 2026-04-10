import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../utils/supabase";
import { COLORS } from "../constants/designTokens";

export default function GoogleAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    const handleCallback = async () => {
      console.log("[GOOGLE-AUTH] handleCallback, code=", params.code ? "present" : "missing");
      if (params.code) {
        try {
          console.log("[GOOGLE-AUTH] exchanging code for session...");
          await supabase.auth.exchangeCodeForSession(params.code);
          console.log("[GOOGLE-AUTH] exchange success");
        } catch (e: any) {
          console.log("[GOOGLE-AUTH] exchange failed:", e?.message || e);
        }
      }
      console.log("[GOOGLE-AUTH] redirecting to /");
      router.replace("/");
    };

    handleCallback();
  }, [params.code]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
