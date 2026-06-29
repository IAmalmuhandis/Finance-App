import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export function getConfiguredApiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return (extra?.apiBaseUrl || "").trim().replace(/\/$/, "");
}

const KEY_API = "arzo_api_base";
const KEY_TOKEN = "arzo_token";
const KEY_EMAIL = "arzo_user_email";
const LEGACY_KEYS = {
  api: ["vaultly_api_base", "tracker_api_base_url"],
  token: ["vaultly_token", "tracker_auth_token"],
  email: ["vaultly_user_email"],
};

async function migrateLegacy() {
  for (const k of LEGACY_KEYS.api) {
    const v = await AsyncStorage.getItem(k);
    if (v && !(await AsyncStorage.getItem(KEY_API))) await AsyncStorage.setItem(KEY_API, v);
  }
  for (const k of LEGACY_KEYS.token) {
    const v = await AsyncStorage.getItem(k);
    if (v && !(await AsyncStorage.getItem(KEY_TOKEN))) await AsyncStorage.setItem(KEY_TOKEN, v);
  }
  for (const k of LEGACY_KEYS.email) {
    const v = await AsyncStorage.getItem(k);
    if (v && !(await AsyncStorage.getItem(KEY_EMAIL))) await AsyncStorage.setItem(KEY_EMAIL, v);
  }
}

export async function getApiBase(): Promise<string> {
  await migrateLegacy();
  const fromConfig = getConfiguredApiBase();
  const fromStore = ((await AsyncStorage.getItem(KEY_API)) || "").trim().replace(/\/$/, "");
  // Build-time .env wins so Mobile/.env changes apply after restarting Expo.
  if (fromConfig) {
    if (fromConfig !== fromStore) await AsyncStorage.setItem(KEY_API, fromConfig);
    return fromConfig;
  }
  if (fromStore) return fromStore;
  return "";
}

export async function setApiBase(url: string) {
  const trimmed = url.trim().replace(/\/$/, "");
  if (trimmed) await AsyncStorage.setItem(KEY_API, trimmed);
  else await AsyncStorage.removeItem(KEY_API);
}

export async function getToken(): Promise<string> {
  await migrateLegacy();
  return (await AsyncStorage.getItem(KEY_TOKEN)) || "";
}

export async function setToken(token: string) {
  if (token) await AsyncStorage.setItem(KEY_TOKEN, token);
  else await AsyncStorage.removeItem(KEY_TOKEN);
}

export async function getUserEmail(): Promise<string> {
  return (await AsyncStorage.getItem(KEY_EMAIL)) || "";
}

export async function setUserEmail(email: string) {
  if (email) await AsyncStorage.setItem(KEY_EMAIL, email);
  else await AsyncStorage.removeItem(KEY_EMAIL);
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

const DEFAULT_FETCH_MS = 28_000;

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_MS, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function messageFromApiBody(body: string, status: number, fallback: string): string {
  const t = (body || "").trim();
  if (!t) return fallback;
  try {
    const j = JSON.parse(t) as { error?: string; message?: string };
    if (typeof j.error === "string" && j.error.length) return j.error;
    if (typeof j.message === "string" && j.message.length) return j.message;
  } catch {
    /* */
  }
  if (t.startsWith("<!DOCTYPE") || t.startsWith("<html") || t.includes("data-next-head")) {
    return `Server returned a web page instead of JSON (HTTP ${status}). Use your Arzo server URL, e.g. http://192.168.x.x:3000 on the same Wi-Fi.`;
  }
  return t.length > 240 ? `${t.slice(0, 240)}...` : t;
}

export async function apiRegister(
  base: string,
  email: string,
  password: string,
  name?: string
): Promise<{ error?: string }> {
  const b = base.replace(/\/$/, "");
  const r = await fetchWithTimeout(`${b}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name?.trim() || undefined }),
  });
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (r.status === 409) return { error: j.error || "This email is already registered" };
  if (!r.ok) return { error: j.error || "Could not create account" };
  return {};
}

export async function fetchSocialAuthConfig(base: string) {
  const b = base.replace(/\/$/, "");
  try {
    const r = await fetchWithTimeout(`${b}/api/auth/social-config`);
    const text = await r.text();
    const trimmed = (text || "").trim();
    const looksHtml =
      trimmed.startsWith("<!DOCTYPE") ||
      trimmed.startsWith("<html") ||
      trimmed.includes("data-next-head");

    if (looksHtml) {
      return {
        google: false,
        googleMobile: false,
        webClientId: null as string | null,
        httpStatus: r.status,
        fetchError: `This URL returned HTML, not the Arzo API. Open ${b}/api/auth/social-config in a browser — it should show JSON.`,
      };
    }

    if (!r.ok) {
      return {
        google: false,
        googleMobile: false,
        webClientId: null as string | null,
        httpStatus: r.status,
        fetchError: messageFromApiBody(text, r.status, `HTTP ${r.status}`),
      };
    }

    const j = JSON.parse(text) as { google?: boolean; googleMobile?: boolean; webClientId?: string | null };
    const web =
      typeof j.webClientId === "string" && j.webClientId.trim().length > 0 ? j.webClientId.trim() : null;
    return {
      google: Boolean(j.google),
      googleMobile: Boolean(j.googleMobile),
      webClientId: web,
      httpStatus: r.status,
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Network error";
    return {
      google: false,
      googleMobile: false,
      webClientId: null as string | null,
      fetchError: raw.includes("aborted") ? "Request timed out — check server URL and Wi-Fi." : raw,
    };
  }
}

export async function apiGoogleLogin(
  base: string,
  idToken: string
): Promise<{ token?: string; email?: string; error?: string }> {
  const b = base.replace(/\/$/, "");
  const r = await fetchWithTimeout(`${b}/api/mobile/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const j = (await r.json().catch(() => ({}))) as { token?: string; email?: string; error?: string };
  if (!r.ok) return { error: j.error || "Google sign-in failed" };
  if (!j.token) return { error: "No token in response" };
  return { token: j.token, email: j.email };
}

export async function apiLogin(
  base: string,
  email: string,
  password: string
): Promise<{ token?: string; email?: string; error?: string }> {
  const b = base.replace(/\/$/, "");
  const r = await fetchWithTimeout(`${b}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = (await r.json().catch(() => ({}))) as { token?: string; email?: string; error?: string };
  if (!r.ok) return { error: j.error || "Sign in failed" };
  if (!j.token) return { error: "No token in response" };
  return { token: j.token, email: j.email };
}

export async function checkHealth(base: string): Promise<{ ok: boolean; message: string }> {
  const b = base.replace(/\/$/, "");
  try {
    const r = await fetchWithTimeout(`${b}/api/health`, { method: "GET" });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (r.status === 503) return { ok: false, message: j.error || "Server or database not ready" };
    if (!r.ok) return { ok: false, message: `HTTP ${r.status}` };
    return { ok: true, message: "Server OK" };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Network error";
    return {
      ok: false,
      message: raw.includes("aborted")
        ? "Request timed out — check server URL and Wi-Fi"
        : "Cannot reach server — use your PC LAN IP (not localhost on a phone)",
    };
  }
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<{ data?: T; error?: string; status: number }> {
  const base = await getApiBase();
  const token = await getToken();
  if (!base || !token) {
    return { status: 401, error: "Not signed in" };
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const r = await fetchWithTimeout(url, {
    ...init,
    headers: { ...authHeaders(token), ...((init?.headers as Record<string, string>) || {}) },
  });
  const text = await r.text();
  if (r.status === 401) return { status: 401, error: "Unauthorized" };
  if (!r.ok) {
    return { status: r.status, error: messageFromApiBody(text, r.status, r.statusText || "Request failed") };
  }
  try {
    return { status: r.status, data: JSON.parse(text) as T };
  } catch {
    return { status: r.status, error: "Invalid JSON from server" };
  }
}

export type EntryRow = {
  id: string;
  createdAt: string;
  grossAmount: number;
  mode: string;
  allocations?: { name: string; type: string; amount: number }[];
};

export type ProgressResponse = {
  totalIncome: number;
  wealthRetained: number;
  totalGiven: number;
  totalSpend: number;
  entryCount: number;
  firstAt: string | null;
  lastAt: string | null;
  byBucket: { name: string; total: number }[];
  wealthSeries: { date: string; wealthRetained: number }[];
};

export function fetchEntries() {
  return fetchJson<{ entries: EntryRow[] }>("/api/entries");
}

export function fetchProgress() {
  return fetchJson<ProgressResponse>("/api/entries/progress");
}

export function createEntry(body: {
  grossAmount: number;
  mode: "recommended" | "custom";
  formulaSnapshot: unknown[];
  allocations: { name: string; type: string; amount: number }[];
}) {
  return fetchJson<{ entry: EntryRow }>("/api/entries", { method: "POST", body: JSON.stringify(body) });
}

export function deleteEntry(id: string) {
  return fetchJson<{ ok: boolean }>(`/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function clearAllEntries() {
  return fetchJson<{ deleted: number }>("/api/entries", { method: "DELETE" });
}

// ── Wealth Projections ────────────────────────────────────────────────────────

import type { ProjectionInput, ProjectionSummary, TransactionRow } from "./wealth-guide";

export type SavedProjection = {
  id: string;
  name?: string;
  createdAt: string;
  summary: ProjectionSummary;
  input: ProjectionInput;
};

export function saveProjection(body: {
  name?: string;
  input: ProjectionInput;
  summary: ProjectionSummary;
  rows: TransactionRow[];
}) {
  return fetchJson<{ projection: SavedProjection }>("/api/projections", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchProjections() {
  return fetchJson<{ projections: SavedProjection[] }>("/api/projections");
}

export function fetchProjection(id: string) {
  return fetchJson<{ projection: SavedProjection & { rows: TransactionRow[] } }>(
    `/api/projections/${encodeURIComponent(id)}`
  );
}

export function deleteProjection(id: string) {
  return fetchJson<{ ok: boolean }>(`/api/projections/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
