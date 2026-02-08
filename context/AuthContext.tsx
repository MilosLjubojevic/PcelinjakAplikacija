import { Session, User } from "@supabase/supabase-js";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../utils/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const isAllowed = await checkAllowedEmail(session.user.email);
        if (!isAllowed) {
          await supabase.auth.signOut();
          setSession(null);
          setLoading(false);
          return;
        }
      }
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAllowedEmail = async (
    email: string | undefined,
  ): Promise<boolean> => {
    if (!email) return false;

    const { data, error } = await supabase
      .from("allowed_emails")
      .select("id")
      .eq("email", email)
      .single();

    return !error && !!data;
  };

  const createSessionFromUrl = async (url: string) => {
    const params = QueryParams.getQueryParams(url);

    let newSession: Session | null = null;

    if (params.params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        params.params.code,
      );
      if (error) throw error;
      newSession = data.session;
    } else {
      const access_token = params.params.access_token;
      const refresh_token = params.params.refresh_token;

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;
        newSession = data.session;
      }
    }

    if (newSession) {
      const isAllowed = await checkAllowedEmail(newSession.user.email);
      if (!isAllowed) {
        await supabase.auth.signOut();
        throw new Error("Nemate dozvolu za pristup ovoj aplikaciji.");
      }
      setSession(newSession);
    }
  };

  const signInWithGoogle = async () => {
    const redirectUri = makeRedirectUri({
      path: "google-auth",
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type === "success" && result.url) {
      await createSessionFromUrl(result.url);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
  };

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
