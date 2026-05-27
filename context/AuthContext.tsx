import { Session, User } from "@supabase/supabase-js";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEV_MODE } from "../constants/devMode";
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

function DevAuthProvider({ children }: { children: ReactNode }) {
  const mockUser = {
    id: "dev-user-id",
    email: "dev@mock.test",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Dev User" },
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    confirmation_sent_at: undefined,
    phone: "",
    phone_confirmed_at: undefined,
    identities: [],
    is_anonymous: false,
  } satisfies User;

  const mockSession = {
    access_token: "dev-access-token",
    refresh_token: "dev-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    provider_token: null,
    provider_refresh_token: null,
    user: mockUser,
  } satisfies Session;

  const mockValue: AuthContextType = {
    session: mockSession,
    user: mockUser,
    loading: false,
    signInWithGoogle: async () => {},
    signOut: async () => {},
  };

  return (
    <AuthContext.Provider value={mockValue}>{children}</AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (DEV_MODE) return <DevAuthProvider>{children}</DevAuthProvider>;
  return <RealAuthProvider>{children}</RealAuthProvider>;
}

function RealAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AUTH] Initializing auth...");
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        console.log(
          "[AUTH] getSession result:",
          session ? `user=${session.user.email}` : "no session",
        );
        if (session) {
          const isAllowed = await checkAllowedEmail(session.user.email);
          console.log(
            "[AUTH] getSession email check:",
            session.user.email,
            "allowed=",
            isAllowed,
          );
          if (!isAllowed) {
            console.log("[AUTH] getSession - email not allowed, signing out");
            await supabase.auth.signOut();
            setSession(null);
            setLoading(false);
            return;
          }
        }
        setSession(session);
        setLoading(false);
      })
      .catch(async (error) => {
        console.log("[AUTH] getSession error:", error.message);
        // Invalid refresh token — clear stale session and show login
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(
        "[AUTH] onAuthStateChange event=",
        _event,
        "session=",
        session ? `user=${session.user.email}` : "null",
      );
      if (_event === "TOKEN_REFRESHED" && !session) {
        // Refresh failed — clear session
        setSession(null);
        return;
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAllowedEmail = async (
    email: string | undefined,
  ): Promise<boolean> => {
    console.log("[AUTH] checkAllowedEmail called with:", email);
    if (!email) {
      console.log("[AUTH] checkAllowedEmail - no email provided");
      return false;
    }

    const { data, error } = await supabase
      .from("allowed_emails")
      .select("id")
      .eq("email", email)
      .single();

    console.log("[AUTH] checkAllowedEmail result:", {
      email,
      data,
      error: error?.message || null,
    });
    return !error && !!data;
  };

  const createSessionFromUrl = async (url: string) => {
    console.log("[AUTH] createSessionFromUrl called with:", url);
    const params = QueryParams.getQueryParams(url);
    console.log("[AUTH] parsed params:", JSON.stringify(params.params));

    let newSession: Session | null = null;

    if (params.params.code) {
      console.log("[AUTH] exchanging code for session...");
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        params.params.code,
      );
      if (error) {
        console.log("[AUTH] exchangeCodeForSession error:", error.message);
        // Code may already be exchanged by google-auth.tsx deep link handler.
        // Check if a session was established there instead.
        console.log("[AUTH] checking for existing session (fallback)...");
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();
        console.log(
          "[AUTH] fallback getSession:",
          existingSession ? `user=${existingSession.user.email}` : "no session",
        );
        if (existingSession) {
          newSession = existingSession;
        } else {
          throw error;
        }
      } else {
        console.log(
          "[AUTH] exchangeCodeForSession success, user=",
          data.session?.user.email,
        );
        newSession = data.session;
      }
    } else if (params.params.error) {
      console.log(
        "[AUTH] OAuth error:",
        params.params.error,
        params.params.error_description,
      );
      throw new Error(params.params.error_description || params.params.error);
    } else {
      const access_token = params.params.access_token;
      const refresh_token = params.params.refresh_token;
      console.log(
        "[AUTH] no code param, access_token=",
        !!access_token,
        "refresh_token=",
        !!refresh_token,
      );

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
      console.log(
        "[AUTH] got session for:",
        newSession.user.email,
        "- checking allowed email...",
      );
      const isAllowed = await checkAllowedEmail(newSession.user.email);
      console.log("[AUTH] email allowed=", isAllowed);
      if (!isAllowed) {
        console.log("[AUTH] email NOT allowed, signing out");
        await supabase.auth.signOut();
        throw new Error("Nemate dozvolu za pristup ovoj aplikaciji.");
      }
      console.log("[AUTH] login complete, setting session");
      setSession(newSession);
    } else {
      console.log("[AUTH] createSessionFromUrl - no session established");
    }
  };

  // Deep-link fallback for Android: Chrome Custom Tabs don't always return
  // the redirect URL to openAuthSessionAsync, so the OS opens the app directly.
  useEffect(() => {
    // App already open — catch incoming deep link
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.includes("google-auth")) {
        console.log("[AUTH] Linking event url:", url);
        createSessionFromUrl(url).catch((e) =>
          console.log("[AUTH] Linking event error:", e?.message),
        );
      }
    });

    // App was cold-started by a deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("google-auth")) {
        console.log("[AUTH] initial URL:", url);
        createSessionFromUrl(url).catch((e) =>
          console.log("[AUTH] initial URL error:", e?.message),
        );
      }
    });

    return () => subscription.remove();
  }, []);

  const signInWithGoogle = async () => {
    // No leading slash — Linking.createURL("google-auth") → pcelinjakaplikacija://google-auth
    // A leading slash produces three slashes (pcelinjakaplikacija:///google-auth) which
    // may not match Supabase's pcelinjakaplikacija://** pattern.
    const redirectUri = Linking.createURL("google-auth");
    console.log("[AUTH] signInWithGoogle - redirectUri=", redirectUri);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        queryParams: {
          // Force Google to show account picker — prevents Chrome from silently
          // reusing a cached session that has the website's redirect_to baked in.
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.log("[AUTH] signInWithOAuth error:", error.message);
      throw error;
    }
    console.log("[AUTH] signInWithOAuth success, opening browser...");
    console.log("[AUTH] data.url=", data.url);

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    console.log("[AUTH] browser result:", result.type);

    if (result.type === "success" && result.url) {
      // iOS path: ASWebAuthenticationSession intercepted the redirect
      console.log("[AUTH] browser returned URL:", result.url);
      await createSessionFromUrl(result.url);
    } else {
      console.log("[AUTH] browser dismissed or failed, type=", result.type);
      // Android path: redirect was handled as a deep link via the Linking listener above
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
