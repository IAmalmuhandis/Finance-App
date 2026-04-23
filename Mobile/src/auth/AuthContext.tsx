import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";

type AuthState = {
  isReady: boolean;
  isSignedIn: boolean;
  email: string;
  apiBase: string;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [apiBase, setApiBaseState] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const signOut = useCallback(async () => {
    await api.setToken("");
    await api.setUserEmail("");
    setIsSignedIn(false);
    setEmail("");
    setError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isReady,
      isSignedIn,
      email,
      apiBase,
      error,
      signIn,
      signUp,
      signOut,
    }),
    [isReady, isSignedIn, email, apiBase, error, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
