import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";
import { getGoogleWebClientId } from "../lib/google-config";

type AuthState = {
  isReady: boolean;
  isSignedIn: boolean;
  email: string;
  apiBase: string;
  error: string | null;
  signingOut: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signInWithGoogle: (idToken: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [apiBase, setApiBaseState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const resolveBase = useCallback(async (): Promise<string> => {
    const stored = (await api.getApiBase()).trim();
    const fromConfig = api.getConfiguredApiBase();
    const resolved = stored || fromConfig;
    if (!stored && fromConfig) {
      await api.setApiBase(fromConfig);
    }
    return resolved.replace(/\/$/, "");
  }, []);

  const hydrate = useCallback(async () => {
    setError(null);
    const base = await resolveBase();
    setApiBaseState(base);
    const t = await api.getToken();
    const em = await api.getUserEmail();
    setEmail(em);
    setIsSignedIn(!!t);
    setIsReady(true);
  }, [resolveBase]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const performLogin = useCallback(
    async (em: string, password: string) => {
      const trimmed = await resolveBase();
      if (!trimmed) {
        setError("Add your Vaultly server URL on the sign-in screen (or set EXPO_PUBLIC_API_BASE_URL in Mobile/.env).");
        return false;
      }
      setApiBaseState(trimmed);
      const health = await api.checkHealth(trimmed);
      if (!health.ok) {
        setError(health.message);
        return false;
      }
      const res = await api.apiLogin(trimmed, em.trim().toLowerCase(), password);
      if (res.error || !res.token) {
        setError(res.error || "Invalid email or password.");
        return false;
      }
      await api.setToken(res.token);
      await api.setUserEmail(em.trim());
      setEmail(em.trim());
      setIsSignedIn(true);
      setError(null);
      return true;
    },
    [resolveBase]
  );

  const signIn = useCallback(
    async (em: string, password: string) => {
      setError(null);
      return performLogin(em, password);
    },
    [performLogin]
  );

  const signUp = useCallback(
    async (em: string, password: string, name: string) => {
      setError(null);
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return false;
      }
      const trimmed = await resolveBase();
      if (!trimmed) {
        setError("Add your Vaultly server URL on the sign-in screen (or set EXPO_PUBLIC_API_BASE_URL in Mobile/.env).");
        return false;
      }
      setApiBaseState(trimmed);
      const health = await api.checkHealth(trimmed);
      if (!health.ok) {
        setError(health.message);
        return false;
      }
      const reg = await api.apiRegister(trimmed, em, password, name);
      if (reg.error) {
        setError(reg.error);
        return false;
      }
      return performLogin(em, password);
    },
    [resolveBase, performLogin]
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      setError(null);
      const trimmed = await resolveBase();
      if (!trimmed) {
        setError("Add your Vaultly server URL first, then try Google again.");
        return false;
      }
      setApiBaseState(trimmed);
      const social = await api.fetchSocialAuthConfig(trimmed);
      if (social.fetchError) {
        setError(social.fetchError);
        return false;
      }
      if (!social.googleMobile) {
        if (social.webClientId) {
          setError(
            "Mobile Google sign-in needs NEXTAUTH_SECRET on the Vaultly server (same variable the web app uses)."
          );
        } else if (getGoogleWebClientId()) {
          setError(
            "The server did not return a Google Web Client ID. Set GOOGLE_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_CLIENT_ID) on the Vaultly server to match the mobile app, then restart the server."
          );
        } else {
          setError("Could not load Google client ID from this server. Check GOOGLE_CLIENT_ID on the server.");
        }
        return false;
      }
      if (!social.webClientId) {
        setError(
          "Could not load Google client ID from this server. Check GOOGLE_CLIENT_ID on the server and try again."
        );
        return false;
      }
      const health = await api.checkHealth(trimmed);
      if (!health.ok) {
        setError(health.message);
        return false;
      }
      const res = await api.apiGoogleLogin(trimmed, idToken);
      if (res.error || !res.token) {
        setError(res.error || "Google sign-in failed.");
        return false;
      }
      await api.setToken(res.token);
      const em = (res.email || "").trim().toLowerCase();
      await api.setUserEmail(em);
      setEmail(em);
      setIsSignedIn(true);
      setError(null);
      return true;
    },
    [resolveBase]
  );

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await api.setToken("");
      await api.setUserEmail("");
      setIsSignedIn(false);
      setEmail("");
      setError(null);
    } finally {
      setSigningOut(false);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isReady,
      isSignedIn,
      email,
      apiBase,
      error,
      signingOut,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [isReady, isSignedIn, email, apiBase, error, signingOut, signIn, signUp, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
